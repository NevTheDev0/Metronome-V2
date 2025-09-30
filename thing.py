import csv
import os


def combine_two_csvs(file1_path, file2_path, output_path):
    """
    Combines the data from two CSV files into a single new CSV file.

    It reads the header from the first file and appends all data rows
    from both files, assuming they have the same column structure.

    Args:
        file1_path (str): The path to the first input CSV file.
        file2_path (str): The path to the second input CSV file.
        output_path (str): The path to the output CSV file.
    """

    try:
        # Read data from the first file
        print(f"Reading data from: {file1_path}")
        with open(file1_path, "r", newline="", encoding="utf-8") as f1:
            reader1 = csv.reader(f1)
            header = next(reader1)  # Get the header from the first file
            data1 = list(reader1)  # Get all data rows

        # Read data from the second file
        print(f"Reading data from: {file2_path}")
        with open(file2_path, "r", newline="", encoding="utf-8") as f2:
            reader2 = csv.reader(f2)
            next(reader2)  # Skip the header of the second file
            data2 = list(reader2)  # Get all data rows

        # Combine the data
        combined_data = data1 + data2

        # Write the combined data to the new output file
        print(f"Writing combined data to: {output_path}")
        with open(output_path, "w", newline="", encoding="utf-8") as outfile:
            writer = csv.writer(outfile)
            writer.writerow(header)  # Write the header
            writer.writerows(combined_data)  # Write all the combined data

        print("\nSuccess! Files combined.")
        print(f"Total rows in new file (including header): {len(combined_data) + 1}")

    except FileNotFoundError:
        print("\nError: One or both of the input files were not found.")
        print("Please check the file paths and try again.")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")


# --- Main execution part of the script ---
if __name__ == "__main__":
    # --- CHANGE THESE FILE PATHS TO YOUR ACTUAL FILES ---
    # Be sure to include the full path to the files
    file_one = r"D:\MetronomeV22\Metronome-V2\Backend\Data\Combined\merged_output_dirty.csv"
    file_two = r"D:\MetronomeV22\Metronome-V2\Backend\Data\Combined\merged_output.csv"
    output_file = "fixed_merged.csv"

    combine_two_csvs(file_one, file_two, output_file)
