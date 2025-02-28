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
                        if value and value != "-" and value.lower() != "null":
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
                
                preview_text += "\n"
        
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
        
        # Split by separator lines (multiple dashes) to get individual reports
        raw_reports = []
        current_report = []
        
        lines = bulk_text.split("\n")
        for line in lines:
            # Check if this is a separator line (multiple dashes)
            if line.strip() and all(c == '-' for c in line.strip()):
                if current_report:
                    raw_reports.append("\n".join(current_report))
                    current_report = []
            else:
                current_report.append(line)
        
        # Add the last report if there is one
        if current_report:
            raw_reports.append("\n".join(current_report))
        
        # If no reports were found using separator lines, try the double blank line method
        if not raw_reports:
            # Split by double blank lines to get individual reports
            raw_reports = []
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
        
        # If still no reports were found, try the original method
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
        
        print(f"Found {len(raw_reports)} raw reports")
        
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
                line_text = line.strip()
                if not line_text:
                    continue
                    
                print(f"Line {i}: {repr(line)}")
                
                # Check if this is a main key-value line (not indented)
                if ":" in line_text and not line.startswith(" ") and not line.startswith("\t"):
                    key, value = line_text.split(":", 1)
                    key = key.strip()
                    value = value.strip()
                    print(f"Found main key-value: {key} = {value}")
                    
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
                        report["labels"][current_label] = {"label": None, "referenceLink": None}
                        print(f"Found label section: {current_label}")
                
                # Check if this is an indented property line
                elif line.startswith(" ") or line.startswith("\t"):
                    if ":" in line_text and current_label:
                        prop_key, prop_value = line_text.split(":", 1)
                        prop_key = prop_key.strip()
                        prop_value = prop_value.strip()
                        print(f"Found indented property: {prop_key} = {prop_value}")
                        
                        if prop_key == "Label":
                            if prop_value and prop_value.lower() != "null":
                                report["labels"][current_label]["label"] = prop_value
                            else:
                                report["labels"][current_label]["label"] = None
                            print(f"Set label description for {current_label}: {prop_value}")
                        
                        elif prop_key == "Reference":
                            if prop_value and prop_value != "-" and prop_value.lower() != "null":
                                report["labels"][current_label]["referenceLink"] = prop_value
                            else:
                                report["labels"][current_label]["referenceLink"] = None
                            print(f"Set reference link for {current_label}: {prop_value}")
            
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
                
                preview_text += "----------------------------------------\n\n"
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
        
        # Track skipped and processed mods
        skipped_mods = []
        processed_mods = []
        
        # Update the JSON data
        for report in self.parsed_mod_reports:
            game = report["game"]
            mod_id = report["id"]
            status = report["status"]
            
            # Check if mod already exists in any status category
            mod_exists = False
            existing_status = None
            existing_reason = None
            
            if game in self.mod_status_data["Mod Statuses"]:
                for status_category, mod_ids in self.mod_status_data["Mod Statuses"][game].items():
                    if mod_id in mod_ids:
                        mod_exists = True
                        existing_status = status_category
                        if game in self.mod_status_data["Mod Descriptors"] and mod_id in self.mod_status_data["Mod Descriptors"][game]:
                            existing_reason = self.mod_status_data["Mod Descriptors"][game][mod_id].get("reason", "No reason provided")
                        break
            
            # Also check if mod exists in Mod Descriptors
            if not mod_exists and game in self.mod_status_data["Mod Descriptors"] and mod_id in self.mod_status_data["Mod Descriptors"][game]:
                mod_exists = True
                existing_reason = self.mod_status_data["Mod Descriptors"][game][mod_id].get("reason", "No reason provided")
            
            if mod_exists:
                skip_message = f"{game}/{mod_id}"
                if existing_status == status and existing_reason == report.get("reason"):
                    skip_message += " (Duplicate report - same status and reason)"
                else:
                    skip_message += f"\n    Status: {existing_status}\n    Reason: {existing_reason}"
                skipped_mods.append(skip_message)
                print(f"Skipping mod: {skip_message}")
                continue
            
            processed_mods.append(f"{game}/{mod_id}")
            
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
                # Use custom encoder to handle None values properly
                json.dump(self.mod_status_data, f, indent=2, ensure_ascii=False, 
                         default=lambda o: None if o is None or (isinstance(o, str) and (o.lower() == "null" or o == "\u3164")) else o)
            
            # Prepare result message
            result_message = f"Successfully saved {len(processed_mods)} mod reports to {self.mod_status_path}"
            if skipped_mods:
                # Group skipped mods by game
                skipped_by_game = {}
                # Also track duplicate reports separately
                duplicate_by_game = {}
                
                for mod in skipped_mods:
                    game_id = mod.split('/')[0]
                    mod_id = mod.split('/')[1].split(' ')[0]  # Extract just the mod ID
                    
                    # Check if this is a duplicate report
                    if "(Duplicate report - same status and reason)" in mod:
                        if game_id not in duplicate_by_game:
                            duplicate_by_game[game_id] = []
                        duplicate_by_game[game_id].append(mod_id)
                    else:
                        # Regular skipped mod with different status/reason
                        if game_id not in skipped_by_game:
                            skipped_by_game[game_id] = []
                        skipped_by_game[game_id].append(mod)
                
                # Format the skipped mods message
                result_message += f"\n\nSkipped {len(skipped_mods)} existing mods:"
                
                # First list duplicate reports in a compact format
                if duplicate_by_game:
                    result_message += "\n\nDuplicate reports (same status and reason):"
                    for game, mod_ids in sorted(duplicate_by_game.items()):
                        result_message += f"\n{game}: {', '.join(mod_ids)}"
                
                # Then list other skipped mods with different status/reason
                if skipped_by_game:
                    result_message += "\n\nMods with different status/reason:"
                    for game, mods in sorted(skipped_by_game.items()):
                        result_message += f"\n\n{game}:"
                        for mod in mods:
                            # Remove the game prefix from each entry since we're grouping by game
                            mod_entry = mod.replace(f"{game}/", "")
                            result_message += f"\n  - {mod_entry}"
            
            QMessageBox.information(self, "Success", result_message)
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
        
        # Track skipped and processed authors
        skipped_authors = []
        processed_authors = []
        
        # Update the JSON data
        for report in self.parsed_author_reports:
            username = report["username"]
            print(f"Processing report for username: {username}")
            
            # Check if author already exists in any label
            author_exists = False
            existing_labels = []
            existing_tooltips = {}
            
            # Check existing labels
            for label_name, label_data in self.author_status_data.get("Labels", {}).items():
                if "authors" in label_data and username in label_data["authors"]:
                    author_exists = True
                    existing_labels.append(label_name)
            
            # Check existing tooltips
            if username in self.author_status_data.get("Tooltips", {}):
                author_exists = True
                existing_tooltips = self.author_status_data["Tooltips"][username]
            
            if author_exists:
                skip_message = f"{username}"
                
                # Compare labels and tooltips
                new_labels = set(report["label_list"])
                existing_label_set = set(existing_labels)
                
                if new_labels == existing_label_set and self._compare_tooltips(existing_tooltips, report["labels"]):
                    skip_message += " (Duplicate report - same labels and details)"
                else:
                    skip_message += "\n    Existing labels: " + (", ".join(existing_labels) if existing_labels else "None")
                    skip_message += "\n    New labels: " + ", ".join(report["label_list"])
                    if existing_tooltips:
                        skip_message += "\n    Note: Existing tooltips have different details"
                
                skipped_authors.append(skip_message)
                print(f"Skipping author: {skip_message}")
                continue
            
            processed_authors.append(username)
            
            # Add author to each label
            for label_name in report["label_list"]:
                print(f"Adding {username} to label: {label_name}")
                
                if label_name in self.author_status_data["Labels"]:
                    if "authors" not in self.author_status_data["Labels"][label_name]:
                        self.author_status_data["Labels"][label_name]["authors"] = []
                    
                    if username not in self.author_status_data["Labels"][label_name]["authors"]:
                        self.author_status_data["Labels"][label_name]["authors"].append(username)
                        print(f"Added {username} to {label_name} authors list")
                else:
                    print(f"Warning: Label {label_name} not found in author_status_data")
            
            # Add tooltip details
            if report["labels"]:
                if "Tooltips" not in self.author_status_data:
                    self.author_status_data["Tooltips"] = {}
                    
                if username not in self.author_status_data["Tooltips"]:
                    self.author_status_data["Tooltips"][username] = {}
                
                for label_name, details in report["labels"].items():
                    print(f"Adding tooltip for {username} under {label_name}")
                    # Clean up any potential invisible characters
                    label_text = details["label"]
                    reference_link = details["referenceLink"]
                    
                    # Remove the invisible character if present
                    if isinstance(label_text, str):
                        label_text = label_text.replace("\u3164", "")
                    if isinstance(reference_link, str):
                        reference_link = reference_link.replace("\u3164", "")
                    
                    self.author_status_data["Tooltips"][username][label_name] = {
                        "label": label_text,
                        "referenceLink": reference_link
                    }
        
        # Save the updated data
        try:
            with open(self.author_status_path, 'w', encoding='utf-8') as f:
                # Use custom encoder to handle None values properly and prevent invisible characters
                json.dump(self.author_status_data, f, indent=2, ensure_ascii=False,
                         default=lambda o: None if o is None or (isinstance(o, str) and (o.lower() == "null" or o == "\u3164")) else o)
            
            # Prepare result message
            result_message = f"Successfully saved {len(processed_authors)} author reports to {self.author_status_path}"
            if skipped_authors:
                # Sort and categorize skipped authors
                duplicate_authors = []
                different_authors = []
                
                for author in skipped_authors:
                    if "(Duplicate report - same labels and details)" in author:
                        # Just get the username without the explanation
                        username = author.split(" (Duplicate")[0]
                        duplicate_authors.append(username)
                    else:
                        different_authors.append(author)
                
                # Format the skipped authors message
                result_message += f"\n\nSkipped {len(skipped_authors)} existing authors:"
                
                # First list duplicate reports in a compact format
                if duplicate_authors:
                    result_message += "\n\nDuplicate reports (same labels and details):"
                    result_message += f"\n{', '.join(sorted(duplicate_authors))}"
                
                # Then list other skipped authors with different labels/details
                if different_authors:
                    result_message += "\n\nAuthors with different labels/details:"
                    for author in sorted(different_authors):
                        result_message += f"\n  - {author}"
            
            QMessageBox.information(self, "Success", result_message)
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
    
    def _compare_tooltips(self, existing_tooltips, new_tooltips):
        """Helper method to compare tooltip contents"""
        if not existing_tooltips and not new_tooltips:
            return True
            
        if set(existing_tooltips.keys()) != set(new_tooltips.keys()):
            return False
            
        for label, details in new_tooltips.items():
            if label not in existing_tooltips:
                return False
                
            existing_details = existing_tooltips[label]
            if (existing_details.get("label") != details.get("label") or
                existing_details.get("referenceLink") != details.get("referenceLink")):
                return False
                
        return True

def main():
    app = QApplication(sys.argv)
    window = StatusUpdaterGUI()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
