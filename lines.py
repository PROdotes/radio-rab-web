import os

def get_top_files_by_lines(root_dir, top_n=10):
    file_data = []

    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            # Exclude files
            if filename.lower().endswith(('.md', '.png', '.pdf', '.json', '.xml', '.pack', '.jpg')):
                continue
            #exclude data folder
            if dirpath.lower().startswith(('.\\data', '.\\node_modules', '.\\docs', '.\\.git')):
                continue
                
            full_path = os.path.join(dirpath, filename)
            
            try:
                # We open in binary mode to avoid encoding issues while counting lines
                with open(full_path, 'rb') as f:
                    line_count = sum(1 for _ in f)
                file_data.append((full_path, line_count))
            except (OSError, IOError):
                # Skip files that can't be read (permissions, etc.)
                continue

    # Sort by line count in descending order
    file_data.sort(key=lambda x: x[1], reverse=True)

    return file_data[:top_n]

if __name__ == "__main__":
    search_path = "."  # Current directory; change this to your target path
    print(f"Scanning {os.path.abspath(search_path)}...")
    
    top_files = get_top_files_by_lines(search_path)

    print(f"\nTop 10 Files by Line Count (excluding .md):")
    print(f"{'-' * 60}")
    for path, lines in top_files:
        print(f"{lines:,} lines: {path}")