import {Component, OnInit} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";

@Component({
	selector: "app-angle-input",
	templateUrl: "./angle-input.component.html",
	styleUrls: ["./angle-input.component.scss"]
})
export class AngleInputComponent implements OnInit {
	value = "";
	constructor(public dialogRef: MatDialogRef<AngleInputComponent>) {}

	ngOnInit(): void {}

	cancle() {
		this.dialogRef.close();
	}
}
