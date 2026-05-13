import os
import sys
from datetime import datetime
from sqlmodel import Session, create_engine, select
from parse_mariadb import parse_sql_dump
from app.models import (
    User, UserRole, UserStatus,
    HappySheet, DreamProject, LearningFocus,
    TaskSheet, PersonalProject
)

def migrate_data(database_url, sql_dump_path):
    print(f"Connecting to {database_url} ...")
    engine = create_engine(database_url)
    data = parse_sql_dump(sql_dump_path)
    
    with Session(engine) as session:
        # We need an admin user to assign approved statuses if needed, but we can just set them directly
        # 1. Migrate Users
        print("\n--- Migrating Users ---")
        users_in_db = session.exec(select(User)).all()
        existing_emails = {u.email for u in users_in_db}
        
        legacy_users = data.get('users', [])
        legacy_profiles = data.get('employee_profiles', [])
        
        # Map legacy users by ID
        user_mapping = {}  # legacy_id -> new_user_id
        
        for lu in legacy_users:
            email = lu['username']
            if email in existing_emails:
                print(f"User {email} already exists, skipping insert.")
                # find existing user ID so we can map associations
                existing_user = next(u for u in users_in_db if u.email == email)
                user_mapping[lu['id']] = existing_user.id
                continue
                
            # Check profile for extra info
            profile = next((p for p in legacy_profiles if p['user_id'] == lu['id']), {})
            
            # Map role
            role = UserRole.admin if lu['role'] == 'admin' else UserRole.employee
            status = 'APPROVED' if lu['status'] == 'approved' else 'PENDING'
            
            new_user = User(
                name=lu['name'],
                email=email,
                hashed_password=lu['password'],
                role=role,
                status=status,
                created_at=datetime.strptime(lu['created_at'], '%Y-%m-%d %H:%M:%S') if lu.get('created_at') else datetime.now(),
                
                # Profile fields
                department=profile.get('department'),
                profile_picture=profile.get('profile_photo'),
                linkedin_url=profile.get('linkedin_url'),
                github_url=profile.get('github_url')
            )
            # handle date missing
            if profile.get('date_of_joining'):
                try:
                    # sometimes format is 0000-00-00 
                    if not profile['date_of_joining'].startswith('0000-00-00'):
                        new_user.date_joined = datetime.strptime(profile['date_of_joining'], '%Y-%m-%d').date()
                except ValueError:
                    pass

            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            user_mapping[lu['id']] = new_user.id
            existing_emails.add(email)
            print(f"Inserted user: {email} (Legacy ID: {lu['id']} -> New ID: {new_user.id})")
        
        # 2. Migrate Happy Sheets
        print("\n--- Migrating Happy Sheets ---")
        legacy_happy = data.get('happy_sheet', [])
        count_hs = 0
        for lhs in legacy_happy:
            new_uid = user_mapping.get(lhs['user_id'])
            if not new_uid:
                continue
            
            date_val = None
            date_col = 'entry_date' if 'entry_date' in lhs else 'date'
            if lhs.get(date_col):
                try:
                    date_val = datetime.strptime(lhs[date_col], '%Y-%m-%d').date()
                except ValueError:
                    continue
            
            # check if exists to avoid duplicates
            exists = session.exec(select(HappySheet).where(
                HappySheet.user_id == new_uid, HappySheet.date == date_val, HappySheet.what_made_you_happy == lhs.get('happy_today', lhs.get('what_made_you_happy'))
            )).first()
            if exists:
                continue
                
            new_hs = HappySheet(
                user_id=new_uid,
                date=date_val,
                what_made_you_happy=lhs.get('happy_today', lhs.get('what_made_you_happy', '')),
                what_made_others_happy=lhs.get('happy_others', lhs.get('what_made_others_happy', '')),
                goals_without_greed=lhs.get('goals', lhs.get('goals_without_greed', '')),
                dreams_supported=lhs.get('dreams', lhs.get('dreams_supported', ''))
            )
            session.add(new_hs)
            count_hs += 1
            
        # 3. Migrate Dream Projects
        print("\n--- Migrating Dream Projects ---")
        count_dp = 0
        legacy_dp = data.get('dream_projects', [])
        for ldp in legacy_dp:
            new_uid = user_mapping.get(ldp['user_id'])
            if not new_uid:
                continue
            
            exists = session.exec(select(DreamProject).where(
                DreamProject.user_id == new_uid, DreamProject.description == ldp['dream']
            )).first()
            if exists:
                continue
                
            session.add(DreamProject(
                user_id=new_uid,
                description=ldp['dream']
            ))
            count_dp += 1

        # 4. Migrate Learning Goals -> LearningFocus
        print("\n--- Migrating Learning Goals ---")
        count_lf = 0
        legacy_lg = data.get('learning_goals', [])
        for lg in legacy_lg:
            new_uid = user_mapping.get(lg['user_id'])
            if not new_uid:
                continue
            
            exists = session.exec(select(LearningFocus).where(
                LearningFocus.user_id == new_uid, LearningFocus.focus == lg['goal']
            )).first()
            if exists:
                continue
                
            session.add(LearningFocus(
                user_id=new_uid,
                focus=lg['goal']
            ))
            count_lf += 1

        # 5. Migrate Projects -> PersonalProject
        print("\n--- Migrating Projects ---")
        count_pp = 0
        legacy_proj = data.get('projects', [])
        for pj in legacy_proj:
            new_uid = user_mapping.get(pj['created_by'])
            if not new_uid:
                continue
            
            exists = session.exec(select(PersonalProject).where(
                PersonalProject.user_id == new_uid, PersonalProject.title == pj['title']
            )).first()
            if exists:
                continue
                
            session.add(PersonalProject(
                user_id=new_uid,
                title=pj['title']
            ))
            count_pp += 1

        # 6. Migrate Tasks -> TaskSheet
        print("\n--- Migrating Tasks to TaskSheet ---")
        count_ts = 0
        legacy_tasks = data.get('tasks', [])
        for lt in legacy_tasks:
            new_uid = user_mapping.get(lt['user_id'])
            if not new_uid:
                continue
            
            try:
                task_date = datetime.strptime(lt['task_date'], '%Y-%m-%d').date()
            except ValueError:
                task_date = datetime.now().date()
            
            exists = session.exec(select(TaskSheet).where(
                TaskSheet.user_id == new_uid, TaskSheet.date == task_date, TaskSheet.achievements == lt['description']
            )).first()
            if exists:
                continue
                
            session.add(TaskSheet(
                user_id=new_uid,
                date=task_date,
                achievements=lt['description'] or '',
                repo_link=lt['github_link']
            ))
            count_ts += 1

        session.commit()
        print(f"\nMigration Complete!")
        print(f"Inserted: {count_hs} Happy Sheets, {count_dp} Dream Projects, {count_lf} Learning Focuses, {count_pp} Personal Projects, {count_ts} Task Sheets.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python migrate_to_postgres.py <DATABASE_URL> <PATH_TO_SQL_DUMP>")
        sys.exit(1)
        
    db_url = sys.argv[1]
    dump_path = sys.argv[2]
    migrate_data(db_url, dump_path)
