import csv
import os


def merge_and_analyze_uploaded_files(file_paths, output_file, target_column_name):
    """
    Combines all CSV files from a list of uploaded files into a new file and counts classes.
    Adds debug logs to show skipped rows, invalid values, and per-file stats.
    """
    all_data_rows = []
    header = []
    total_hits = 0
    total_non_hits = 0

    try:
        for full_file_path in file_paths:
            if not os.path.exists(full_file_path):
                print(f"\nMISSING FILE: {full_file_path}")
                continue

            print(f"\nProcessing file: {os.path.basename(full_file_path)}")

            with open(full_file_path, "r", newline="", encoding="utf-8") as input_file:
                csv_reader = csv.DictReader(input_file)

                # Use the header from the first file processed
                if not header:
                    header = csv_reader.fieldnames
                    if target_column_name not in header:
                        print(
                            f"  Error: Column '{target_column_name}' not found in the first file. Aborting."
                        )
                        return

                current_file_hits = 0
                current_file_non_hits = 0
                row_count = 0
                skipped_count = 0

                for row in csv_reader:
                    row_count += 1

                    # Check if the row is actually a duplicate header
                    if row.get(target_column_name) == target_column_name:
                        print("  -> WARNING: Found and skipped a duplicate header row.")
                        skipped_count += 1
                        continue

                    all_data_rows.append(row)

                    raw_val = row.get(target_column_name, "").strip()
                    try:
                        if raw_val in ["1", "1.0"]:
                            current_file_hits += 1
                        elif raw_val in ["0", "0.0"]:
                            current_file_non_hits += 1
                        else:
                            raise ValueError(
                                f"Unexpected target value: {repr(raw_val)}"
                            )
                    except Exception as e:
                        print("  SKIPPED ROW:", raw_val, "Reason:", e)
                        skipped_count += 1

                total_hits += current_file_hits
                total_non_hits += current_file_non_hits

                print(
                    f"  -> File summary: {row_count} rows read, "
                    f"{current_file_hits} hits, {current_file_non_hits} non-hits, "
                    f"{skipped_count} skipped"
                )

        if not header:
            print("\nNo CSV files found or processed. Exiting.")
            return

        print(f"\nWriting all combined data to {output_file}")
        with open(output_file, "w", newline="", encoding="utf-8") as output:
            writer = csv.DictWriter(output, fieldnames=header)
            writer.writeheader()
            writer.writerows(all_data_rows)

        print("\n--- Final Summary ---")
        print(f"Total rows (including header): {len(all_data_rows) + 1}")
        print(f"Final Class 1 (Hits) Count: {total_hits}")
        print(f"Final Class 0 (Non-Hits) Count: {total_non_hits}")
        if total_non_hits > 0 and total_hits > 0:
            ratio = total_non_hits / total_hits
            print(f"Final Ratio (Non-Hits : Hits): {ratio:.2f}:1")

    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")


if __name__ == "__main__":
    uploaded_files = [
        "D:\\MetronomeV22\\Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-25T13-20-00.csv",
        "Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-25T13-22-01.csv",
        "Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-25T13-25-32.csv",
        "Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-26T13-38-08.csv",
        "Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-26T13-43-34.csv",
        "Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-26T14-06-42.csv",
        "Metronome-V2\\Backend\\Data\\AllClass0s\\drumming_session_2025-09-26T14-10-05.csv",
    ]

    output_file_path = "merged_sessions.csv"
    target_column_name = "target"

    merge_and_analyze_uploaded_files(
        uploaded_files, output_file_path, target_column_name
    )
