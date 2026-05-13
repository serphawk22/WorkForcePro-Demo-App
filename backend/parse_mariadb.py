import re
import ast

def parse_sql_values(values_str):
    rows = []
    current_row = []
    current_val = []
    in_string = False
    escape = False
    in_tuple = False
    
    for char in values_str:
        if escape:
            current_val.append(char)
            escape = False
            continue
            
        if in_string:
            if char == '\\':
                escape = True
            elif char == "'":
                in_string = False
            current_val.append(char)
        else:
            if char == "'":
                in_string = True
                current_val.append(char)
            elif char == '(':
                if not in_tuple:
                    in_tuple = True
                    current_row = []
                    current_val = []
                else:
                    current_val.append(char)
            elif char == ')':
                if in_tuple:
                    current_row.append(''.join(current_val).strip())
                    rows.append(current_row)
                    in_tuple = False
                    current_val = []
            elif char == ',':
                if in_tuple:
                    current_row.append(''.join(current_val).strip())
                    current_val = []
            else:
                if in_tuple:
                    current_val.append(char)
                    
    # Clean up values (remove surrounding quotes from strings, handle NULL)
    cleaned_rows = []
    for row in rows:
        cleaned_row = []
        for val in row:
            if val.upper() == 'NULL':
                cleaned_row.append(None)
            elif val.startswith("'") and val.endswith("'"):
                # Remove surrounding quotes, but handle any escaped quotes inside
                inner = val[1:-1]
                inner = inner.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\r', '\r')
                cleaned_row.append(inner)
            else:
                # Try to parse as int or float
                try:
                    cleaned_row.append(int(val))
                except ValueError:
                    try:
                        cleaned_row.append(float(val))
                    except ValueError:
                        cleaned_row.append(val)
        cleaned_rows.append(cleaned_row)
        
    return cleaned_rows

def parse_sql_dump(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    table_data = {}
    
    inserts = content.split('INSERT INTO `')
    for insert in inserts[1:]:
        table_name = insert.split('`', 1)[0]
        
        try:
            # Handle column names if they exist
            columns_part = insert.split('(', 1)[1].split(')', 1)[0]
            columns = [c.strip(" `'") for c in columns_part.split(',')]
            
            # Find VALUES case-insensitively, handling whitespace and newlines
            import re
            values_split = re.split(r'\s+VALUES\s*', insert, maxsplit=1, flags=re.IGNORECASE)
            if len(values_split) < 2:
                print(f"Skipping {table_name}: No VALUES clause found")
                continue
                
            values_str = values_split[1].split(';')[0].strip()
            
            rows = parse_sql_values(values_str)
            
            # Map columns to rows
            table_rows = []
            for row in rows:
                if len(row) == len(columns):
                    table_rows.append(dict(zip(columns, row)))
            
            if table_name not in table_data:
                table_data[table_name] = []
            table_data[table_name].extend(table_rows)
        except Exception as e:
            print(f"Error parsing table {table_name}: {e}")
            
    return table_data

if __name__ == "__main__":
    data = parse_sql_dump("/Users/saivarsha/Documents/WorkForcePro/flash_643_employee.sql")
    print("Extracted the following table row counts:")
    for table, rows in data.items():
        print(f" - {table}: {len(rows)} rows")
    
    print("\nSample User 1:")
    if 'users' in data and len(data['users']) > 0:
        print(data['users'][0])
        
    print("\nSample Employee Profile 1:")
    if 'employee_profiles' in data and len(data['employee_profiles']) > 0:
        print(data['employee_profiles'][0])

    print("\nSample Happy Sheet 1:")
    if 'happy_sheet' in data and len(data['happy_sheet']) > 0:
        print(data['happy_sheet'][0])
