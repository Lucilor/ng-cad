import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";

export interface AlertData {
	title?: string;
	content?: any;
	confirm?: boolean;
}

@Component({
	selector: "app-alert",
	templateUrl: "./alert.component.html",
	styleUrls: ["./alert.component.scss"]
})
export class AlertComponent implements OnInit {
	constructor(public dialogRef: MatDialogRef<AlertComponent>, @Inject(MAT_DIALOG_DATA) public data: AlertData) {}

	ngOnInit() {
		const {content} = this.data;
		if (content instanceof Error) {
			this.data.title = "Oops!";
			this.data.content = content.message;
			console.warn(content);
		} else if (typeof content !== "string") {
			try {
				this.data.content = JSON.stringify(content);
			} catch (error) {
				console.warn(error);
			}
		}
	}
}
