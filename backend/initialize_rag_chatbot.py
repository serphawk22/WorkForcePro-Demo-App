#!/usr/bin/env python
"""
RAG Chatbot Initialization Script for WorkForce Pro.
Indexes existing content and prepares the RAG system.
"""
import os
from dotenv import load_dotenv
from sqlmodel import Session
from app.database import engine
from app.models import Organization
from app.services.vector_indexing import create_indexer
from sqlmodel import select

load_dotenv()

def initialize_rag_system():
    """Initialize RAG system for all organizations."""
    print("\n" + "="*70)
    print("RAG CHATBOT INITIALIZATION")
    print("="*70)
    
    with Session(engine) as session:
        # Get all organizations
        orgs = session.exec(select(Organization)).all()
        
        if not orgs:
            print("\n✗ No organizations found. Create an organization first.")
            return
        
        for org in orgs:
            print(f"\n[Organization: {org.name}]")
            
            indexer = create_indexer(session)
            
            # Index default documentation
            print("  Indexing documentation...")
            doc_count = indexer.index_default_documentation()
            print(f"    ✓ {doc_count} documentation pages indexed")
            
            # Bulk index tasks
            print("  Indexing tasks...")
            task_count = indexer.bulk_index_tasks(org.id)
            print(f"    ✓ {task_count} tasks indexed")
            
            # Bulk index workspaces
            print("  Indexing workspaces...")
            workspace_count = indexer.bulk_index_workspaces(org.id)
            print(f"    ✓ {workspace_count} workspaces indexed")
            
            # Bulk index users
            print("  Indexing users...")
            user_count = indexer.bulk_index_users(org.id)
            print(f"    ✓ {user_count} users indexed")
            
            total = doc_count + task_count + workspace_count + user_count
            print(f"\n  ✓ Total items indexed: {total}")
    
    print("\n" + "="*70)
    print("✓ RAG SYSTEM INITIALIZATION COMPLETE")
    print("="*70)
    print("\nChatbot Features Enabled:")
    print("  • Semantic search across tasks, projects, users, and docs")
    print("  • Natural language intent classification")
    print("  • Context-aware responses")
    print("  • Navigation suggestions")
    print("  • Intelligent action recommendations\n")


if __name__ == "__main__":
    initialize_rag_system()
