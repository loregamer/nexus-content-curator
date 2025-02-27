#!/usr/bin/env python3
import sys
import json
import os
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QTextEdit, QComboBox, QPushButton, QMessageBox,
    QGroupBox, QFormLayout, QScrollArea, QSplitter, QFileDialog
)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QFont, QIcon

class StatusUpdaterGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Nexus Content Curator - Status Updater")
        self.setMinimumSize(900, 700)
        
        # Initialize file paths
        self.mod_status_path = os.path.join("Resources", "mod-status.json")
        self.author_status_path = os.path.join("Resources", "author-status.json")
        
        # Load JSON data
        self.load_json_data()
        
        # Setup UI
        self.setup_ui()
    
    def load_json_data(self):
        """Load JSON data from files"""
        try:
            with open(self.mod_status_path, 'r', encoding='utf-8') as f:
                self.mod_status_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self.mod_status_data = {
                "Mod Statuses": {},
                "Mod Descriptors": {},
                "Keyword Rules": {"global": {}}
            }
            QMessageBox.warning(self, "Warning", f"Could not load mod-status.json: {str(e)}")
        
        try:
            with open(self.author_status_path, 'r', encoding='utf-8') as f:
                self.author_status_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self.author_status_data = {
                "Labels": {},
                "Tooltips": {}
            }
            QMessageBox.warning(self, "Warning", f"Could not load author-status.json: {str(e)}")
    
    def setup_ui(self):
        """Setup the main UI components"""
        # Create central widget and main layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Create tab widget
        tab_widget = QTabWidget()
        main_layout.addWidget(tab_widget)
        
        # Create tabs
        mod_tab = QWidget()
        author_tab = QWidget()
        
        tab_widget.addTab(mod_tab, "Mod Reports")
        tab_widget.addTab(author_tab, "Author Reports")
        
        # Setup mod tab
        self.setup_mod_tab(mod_tab)
        
        # Setup author tab
        self.setup_author_tab(author_tab)
        
        # Add file path display and change buttons
        file_paths_group = QGroupBox("File Paths")
        file_paths_layout = QFormLayout()
        
        # Mod status file path
        mod_path_layout = QHBoxLayout()
        self.mod_path_label = QLineEdit(self.mod_status_path)
        self.mod_path_label.setReadOnly(True)
        mod_path_button = QPushButton("Change")
        mod_path_button.clicked.connect(lambda: self.change_file_path("mod"))
        mod_path_layout.addWidget(self.mod_path_label)
        mod_path_layout.addWidget(mod_path_button)
        
        # Author status file path
        author_path_layout = QHBoxLayout()
        self.author_path_label = QLineEdit(self.author_status_path)
        self.author_path_label.setReadOnly(True)
        author_path_button = QPushButton("Change")
        author_path_button.clicked.connect(lambda: self.change_file_path("author"))
        author_path_layout.addWidget(self.author_path_label)
        author_path_layout.addWidget(author_path_button)
        
        file_paths_layout.addRow("Mod Status JSON:", mod_path_layout)
        file_paths_layout.addRow("Author Status JSON:", author_path_layout)
        file_paths_group.setLayout(file_paths_layout)
        
        main_layout.addWidget(file_paths_group)
    
    def setup_mod_tab(self, tab):
        """Setup the mod reports tab"""
        layout = QVBoxLayout(tab)
        
        # Create a splitter for input and preview
        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)
        
        # Input section
        input_widget = QWidget()
        input_layout = QVBoxLayout(input_widget)
        
        # Bulk input
        bulk_group = QGroupBox("Bulk Mod Reports Input")
        bulk_layout = QVBoxLayout()
        
        bulk_label = QLabel("Enter mod reports in the following format:\n\n"
                           "Game Shortname: <game>\n"
                           "Mod ID: <id>\n"
                           "Status: <status>\n"
                           "Reason: <reason>\n"
                           "Alternative: <alternative_url>\n\n"
                           "Leave a blank line between reports.")
        bulk_layout.addWidget(bulk_label)
        
        self.mod_bulk_input = QTextEdit()
        self.mod_bulk_input.setPlaceholderText("Game Shortname: baldursgate3\n"
                                              "Mod ID: 12345\n"
                                              "Status: BROKEN\n"
                                              "Reason: Outdated and causes crashes\n"
                                              "Alternative: https://www.nexusmods.com/baldursgate3/mods/54321")
        bulk_layout.addWidget(self.mod_bulk_input)
        
        # Status options
        status_layout = QHBoxLayout()
        status_label = QLabel("Available Statuses:")
        self.status_combo = QComboBox()
        self.status_combo.addItems(["BROKEN", "LAME", "ABANDONED", "CAUTION", "INFORMATIVE"])
        self.status_combo.setToolTip("Click to insert status at cursor position")
        self.status_combo.activated.connect(self.insert_status)
        status_layout.addWidget(status_label)
        status_layout.addWidget(self.status_combo)
        bulk_layout.addLayout(status_layout)
        
        # Game options
        game_layout = QHBoxLayout()
        game_label = QLabel("Common Games:")
        self.game_combo = QComboBox()
        
        # Get unique game names from mod status data
        games = set()
        if "Mod Statuses" in self.mod_status_data:
            games.update(self.mod_status_data["Mod Statuses"].keys())
        
        self.game_combo.addItems(sorted(games) if games else ["baldursgate3", "skyrimspecialedition", "newvegas"])
        self.game_combo.setToolTip("Click to insert game at cursor position")
        self.game_combo.activated.connect(self.insert_game)
        game_layout.addWidget(game_label)
        game_layout.addWidget(self.game_combo)
        bulk_layout.addLayout(game_layout)
        
        # Parse and preview button
        parse_button = QPushButton("Parse and Preview")
        parse_button.clicked.connect(self.parse_mod_reports)
        bulk_layout.addWidget(parse_button)
        
        bulk_group.setLayout(bulk_layout)
        input_layout.addWidget(bulk_group)
        
        # Add buttons
        buttons_layout = QHBoxLayout()
        
        save_button = QPushButton("Save to JSON")
        save_button.clicked.connect(self.save_mod_reports)
        buttons_layout.addWidget(save_button)
        
        clear_button = QPushButton("Clear")
        clear_button.clicked.connect(lambda: self.mod_bulk_input.clear())
        buttons_layout.addWidget(clear_button)
        
        input_layout.addLayout(buttons_layout)
        
        # Preview section
        preview_widget = QWidget()
        preview_layout = QVBoxLayout(preview_widget)
        
        preview_group = QGroupBox("Preview")
        preview_inner_layout = QVBoxLayout()
        
        self.mod_preview = QTextEdit()
        self.mod_preview.setReadOnly(True)
        preview_inner_layout.addWidget(self.mod_preview)
        
        preview_group.setLayout(preview_inner_layout)
        preview_layout.addWidget(preview_group)
        
        # Add widgets to splitter
        splitter.addWidget(input_widget)
        splitter.addWidget(preview_widget)
        splitter.setSizes([450, 450])
        
        # Store parsed reports
        self.parsed_mod_reports = []
    
    def setup_author_tab(self, tab):
        """Setup the author reports tab"""
        layout = QVBoxLayout(tab)
        
        # Create a splitter for input and preview
        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)
        
        # Input section
        input_widget = QWidget()
        input_layout = QVBoxLayout(input_widget)
        
        # Bulk input
        bulk_group = QGroupBox("Bulk Author Reports Input")
        bulk_layout = QVBoxLayout()
        
        bulk_label = QLabel("Enter author reports in the following format:\n\n"
                           "Username: <username>\n"
                           "Labels: <label1>, <label2>, ...\n\n"
                           "Label1:\n"
                           "  Label: <description>\n"
                           "  Reference: <reference_link>\n\n"
                           "Leave a blank line between reports.")
        bulk_layout.addWidget(bulk_label)
        
        self.author_bulk_input = QTextEdit()
        self.author_bulk_input.setPlaceholderText("Username: ExampleUser\n"
                                                 "Labels: Bug Ignorer, Flight Risk\n\n"
                                                 "Bug Ignorer:\n"
                                                 "  Label: Ignores reported bugs and doesn't fix them\n"
                                                 "  Reference: https://example.com/evidence\n\n"
                                                 "Flight Risk:\n"
                                                 "  Label: Will abandon mods if criticized\n"
                                                 "  Reference: -")
        bulk_layout.addWidget(self.author_bulk_input)
        
        # Label options
        label_layout = QHBoxLayout()
        label_text = QLabel("Available Labels:")
        self.label_combo = QComboBox()
        
        # Get unique label names from author status data
        labels = []
        if "Labels" in self.author_status_data:
            labels = list(self.author_status_data["Labels"].keys())
        
        self.label_combo.addItems(sorted(labels) if labels else 
                                ["Bug Ignorer", "Flight Risk", "Copystriker", "Paywaller", "Incident", "Troon", "Pride Flag Modder"])
        self.label_combo.setToolTip("Click to insert label at cursor position")
        self.label_combo.activated.connect(self.insert_label)
        label_layout.addWidget(label_text)
        label_layout.addWidget(self.label_combo)
        bulk_layout.addLayout(label_layout)
        
        # Parse and preview button
        parse_button = QPushButton("Parse and Preview")
        parse_button.clicked.connect(self.parse_author_reports)
        bulk_layout.addWidget(parse_button)
        
        bulk_group.setLayout(bulk_layout)
        input_layout.addWidget(bulk_group)
        
        # Add buttons
        buttons_layout = QHBoxLayout()
        
        save_button = QPushButton("Save to JSON")
        save_button.clicked.connect(self.save_author_reports)
        buttons_layout.addWidget(save_button)
        
        clear_button = QPushButton("Clear")
        clear_button.clicked.connect(lambda: self.author_bulk_input.clear())
        buttons_layout.addWidget(clear_button)
        
        input_layout.addLayout(buttons_layout)
        
        # Preview section
        preview_widget = QWidget()
        preview_layout = QVBoxLayout(preview_widget)
        
        preview_group = QGroupBox("Preview")
        preview_inner_layout = QVBoxLayout()
        
        self.author_preview = QTextEdit()
        self.author_preview.setReadOnly(True)
        preview_inner_layout.addWidget(self.author_preview)
        
        preview_group.setLayout(preview_inner_layout)
        preview_layout.addWidget(preview_group)
        
        # Add widgets to splitter
        splitter.addWidget(input_widget)
        splitter.addWidget(preview_widget)
        splitter.setSizes([450, 450])
        
        # Store parsed reports
        self.parsed_author_reports = []
    
    def insert_status(self):
        """Insert selected status at cursor position"""
        status = self.status_combo.currentText()
        cursor = self.mod_bulk_input.textCursor()
        cursor.insertText(status)
    
    def insert_game(self):
        """Insert selected game at cursor position"""
        game = self.game_combo.currentText()
        cursor = self.mod_bulk_input.textCursor()
        cursor.insertText(game)
    
    def insert_label(self):
        """Insert selected label at cursor position"""
        label = self.label_combo.currentText()
        cursor = self.author_bulk_input.textCursor()
        cursor.insertText(label)
    
    def parse_mod_reports(self):
        """Parse the bulk mod reports input"""
        bulk_text = self.mod_bulk_input.toPlainText().strip()
        if not bulk_text:
            QMessageBox.warning(self, "Warning", "Please enter mod reports to parse.")
            return
        
        # Split by blank lines
        reports = []
        current_report = {}
        current_field = None
        
        # Split the input into reports (separated by blank lines)
        raw_reports = bulk_text.split("\n\n")
        
        self.parsed_mod_reports = []
        preview_text = ""
        
        for raw_report in raw_reports:
            if not raw_report.strip():
                continue
                
            lines = raw_report.strip().split("\n")
            report = {}
            
            for line in lines:
                if ":" in line:
                    key, value = line.split(":", 1)
                    key = key.strip()
                    value = value.strip()
                    
                    if key == "Game Shortname":
                        report["game"] = value
                    elif key == "Mod ID":
                        report["id"] = value
                    elif key == "Status":
                        report["status"] = value
                    elif key == "Reason":
                        report["reason"] = value
                    elif key == "Alternative":
                        if value and value != "-":
                            report["alternative"] = value
                        else:
                            report["alternative"] = None
            
            # Validate report
            if "game" in report and "id" in report and "status" in report:
                self.parsed_mod_reports.append(report)
                
                # Add to preview
                preview_text += f"Game: {report.get('game', '')}\n"
                preview_text += f"Mod ID: {report.get('id', '')}\n"
                preview_text += f"Status: {report.get('status', '')}\n"
                
                if "reason" in report:
                    preview_text += f"Reason: {report['reason']}\n"
                
                if "alternative" in report:
                    if report["alternative"]:
                        preview_text += f"Alternative: {report['alternative']}\n"
                    else:
                        preview_text += "Alternative: None\n"
                
                preview_text += "\n" + "-" * 40 + "\n\n"
        
        if not self.parsed_mod_reports:
            QMessageBox.warning(self, "Warning", "No valid mod reports found. Please check the format.")
            return
        
        self.mod_preview.setText(preview_text)
        QMessageBox.information(self, "Success", f"Successfully parsed {len(self.parsed_mod_reports)} mod reports.")
    
    def parse_author_reports(self):
        """Parse the bulk author reports input"""
        bulk_text = self.author_bulk_input.toPlainText().strip()
        if not bulk_text:
            QMessageBox.warning(self, "Warning", "Please enter author reports to parse.")
            return
        
        # Debug print
        print("Parsing author reports:")
        print(f"Raw input: {repr(bulk_text)}")
        
        # Split by double blank lines to get individual reports
        # This allows for a single blank line within a report
        raw_reports = []
        lines = bulk_text.split("\n")
        current_report = []
        blank_line_count = 0
        
        for line in lines:
            if not line.strip():
                blank_line_count += 1
                if blank_line_count >= 2:  # Two or more consecutive blank lines separate reports
                    if current_report:
                        raw_reports.append("\n".join(current_report))
                        current_report = []
                    blank_line_count = 0
                else:
                    current_report.append(line)  # Keep single blank lines within a report
            else:
                blank_line_count = 0
                current_report.append(line)
        
        if current_report:
            raw_reports.append("\n".join(current_report))
        
        # If no reports were found using double blank lines, try the original method
        if not raw_reports:
            # Original parsing logic as fallback
            raw_reports = []
            current_report = ""
            
            for line in bulk_text.split("\n"):
                if line.strip():
                    current_report += line + "\n"
                elif current_report:
                    raw_reports.append(current_report.strip())
                    current_report = ""
            
            if current_report:
                raw_reports.append(current_report.strip())
        
        print(f"Raw reports: {raw_reports}")
        
        self.parsed_author_reports = []
        preview_text = ""
        
        for raw_report in raw_reports:
            lines = raw_report.split("\n")
            report = {"labels": {}}
            current_label = None
            username = None
            label_list = None
            
            print(f"Processing report: {raw_report}")
            
            for i, line in enumerate(lines):
                print(f"Line {i}: {repr(line)}")
                if ":" in line and not line.startswith("  "):
                    key, value = line.split(":", 1)
                    key = key.strip()
                    value = value.strip()
                    print(f"Found key-value: {key} = {value}")
                    
                    if key == "Username":
                        report["username"] = value
                        username = value
                    elif key == "Labels":
                        labels = [label.strip() for label in value.split(",")]
                        report["label_list"] = labels
                        label_list = labels
                        print(f"Label list: {report['label_list']}")
                    else:
                        # This is a label section
                        current_label = key
                        report["labels"][current_label] = {"label": "", "referenceLink": None}
                        print(f"Found label section: {current_label}")
                
                elif line.strip().startswith("Label:") and current_label:
                    _, value = line.split(":", 1)
                    report["labels"][current_label]["label"] = value.strip()
                    print(f"Set label description for {current_label}: {value.strip()}")
                
                elif line.strip().startswith("Reference:") and current_label:
                    _, value = line.split(":", 1)
                    value = value.strip()
                    if value and value != "-":
                        report["labels"][current_label]["referenceLink"] = value
                        print(f"Set reference link for {current_label}: {value}")
            
            # Validate report
            print(f"Final report: {report}")
            print(f"Has username: {'username' in report}")
            print(f"Has label_list: {'label_list' in report}")
            print(f"Has labels: {bool(report['labels'])}")
            
            if "username" in report and "label_list" in report and report["labels"]:
                self.parsed_author_reports.append(report)
                print("Report is valid and added to parsed_author_reports")
                
                # Add to preview
                preview_text += f"Username: {report['username']}\n"
                preview_text += f"Labels: {', '.join(report['label_list'])}\n\n"
                
                for label, details in report["labels"].items():
                    preview_text += f"{label}:\n"
                    preview_text += f"  Label: {details['label']}\n"
                    
                    if details["referenceLink"]:
                        preview_text += f"  Reference: {details['referenceLink']}\n"
                    else:
                        preview_text += "  Reference: None\n"
                    
                    preview_text += "\n"
                
                preview_text += "-" * 40 + "\n\n"
            else:
                print("Report is invalid and will be skipped")
        
        if not self.parsed_author_reports:
            QMessageBox.warning(self, "Warning", "No valid author reports found. Please check the format.")
            return
        
        self.author_preview.setText(preview_text)
        QMessageBox.information(self, "Success", f"Successfully parsed {len(self.parsed_author_reports)} author reports.")
    
    def save_mod_reports(self):
        """Save the parsed mod reports to the JSON file"""
        if not self.parsed_mod_reports:
            QMessageBox.warning(self, "Warning", "No mod reports to save. Please parse reports first.")
            return
        
        # Make a backup of the original file
        try:
            with open(self.mod_status_path, 'r', encoding='utf-8') as f:
                original_data = json.load(f)
                
            backup_path = self.mod_status_path + ".bak"
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(original_data, f, indent=2)
        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Could not create backup: {str(e)}")
        
        # Update the JSON data
        for report in self.parsed_mod_reports:
            game = report["game"]
            mod_id = report["id"]
            status = report["status"]
            
            # Ensure game exists in both sections
            if game not in self.mod_status_data["Mod Statuses"]:
                self.mod_status_data["Mod Statuses"][game] = {}
            
            if game not in self.mod_status_data["Mod Descriptors"]:
                self.mod_status_data["Mod Descriptors"][game] = {}
            
            # Ensure status category exists
            if status not in self.mod_status_data["Mod Statuses"][game]:
                self.mod_status_data["Mod Statuses"][game][status] = []
            
            # Add mod ID to status category if not already there
            if mod_id not in self.mod_status_data["Mod Statuses"][game][status]:
                self.mod_status_data["Mod Statuses"][game][status].append(mod_id)
            
            # Add or update mod descriptor
            descriptor = {}
            if "reason" in report:
                descriptor["reason"] = report["reason"]
            
            if "alternative" in report:
                descriptor["alternative"] = report["alternative"]
            
            self.mod_status_data["Mod Descriptors"][game][mod_id] = descriptor
        
        # Save the updated data
        try:
            with open(self.mod_status_path, 'w', encoding='utf-8') as f:
                json.dump(self.mod_status_data, f, indent=2)
            
            QMessageBox.information(self, "Success", f"Successfully saved {len(self.parsed_mod_reports)} mod reports to {self.mod_status_path}")
            self.parsed_mod_reports = []
            self.mod_preview.clear()
            self.mod_bulk_input.clear()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save mod reports: {str(e)}")
    
    def save_author_reports(self):
        """Save the parsed author reports to the JSON file"""
        if not self.parsed_author_reports:
            QMessageBox.warning(self, "Warning", "No author reports to save. Please parse reports first.")
            return
        
        # Make a backup of the original file
        try:
            with open(self.author_status_path, 'r', encoding='utf-8') as f:
                original_data = json.load(f)
                
            backup_path = self.author_status_path + ".bak"
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(original_data, f, indent=2)
        except Exception as e:
            QMessageBox.warning(self, "Warning", f"Could not create backup: {str(e)}")
        
        # Update the JSON data
        for report in self.parsed_author_reports:
            username = report["username"]
            
            # Add author to each label
            for label_name in report["label_list"]:
                if label_name in self.author_status_data["Labels"]:
                    if "authors" not in self.author_status_data["Labels"][label_name]:
                        self.author_status_data["Labels"][label_name]["authors"] = []
                    
                    if username not in self.author_status_data["Labels"][label_name]["authors"]:
                        self.author_status_data["Labels"][label_name]["authors"].append(username)
            
            # Add tooltip details
            if report["labels"]:
                if username not in self.author_status_data["Tooltips"]:
                    self.author_status_data["Tooltips"][username] = {}
                
                for label_name, details in report["labels"].items():
                    self.author_status_data["Tooltips"][username][label_name] = {
                        "label": details["label"],
                        "referenceLink": details["referenceLink"]
                    }
        
        # Save the updated data
        try:
            with open(self.author_status_path, 'w', encoding='utf-8') as f:
                json.dump(self.author_status_data, f, indent=2)
            
            QMessageBox.information(self, "Success", f"Successfully saved {len(self.parsed_author_reports)} author reports to {self.author_status_path}")
            self.parsed_author_reports = []
            self.author_preview.clear()
            self.author_bulk_input.clear()
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save author reports: {str(e)}")
    
    def change_file_path(self, file_type):
        """Change the file path for mod or author status JSON"""
        if file_type == "mod":
            file_path, _ = QFileDialog.getOpenFileName(
                self, "Select Mod Status JSON File", "", "JSON Files (*.json)"
            )
            if file_path:
                self.mod_status_path = file_path
                self.mod_path_label.setText(file_path)
                self.load_json_data()
        elif file_type == "author":
            file_path, _ = QFileDialog.getOpenFileName(
                self, "Select Author Status JSON File", "", "JSON Files (*.json)"
            )
            if file_path:
                self.author_status_path = file_path
                self.author_path_label.setText(file_path)
                self.load_json_data()

def main():
    app = QApplication(sys.argv)
    window = StatusUpdaterGUI()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
