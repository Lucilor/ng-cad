import {Component, Output, EventEmitter, Inject, OnInit} from "@angular/core";
import {Dimension, CadViewer} from "@lucilor/cad-viewer";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {FormBuilder, FormGroup, ValidatorFn, AbstractControl, FormControl} from "@angular/forms";

@Component({
	selector: "app-dim-form",
	templateUrl: "./dim-form.component.html",
	styleUrls: ["./dim-form.component.scss"]
})
export class DimFormComponent implements OnInit {
	@Output() dimensionEmitter = new EventEmitter<Dimension>();
	form: FormGroup;
	dimension: Dimension;
	constructor(
		private fb: FormBuilder,
		public dialogRef: MatDialogRef<DimFormComponent>,
		@Inject(MAT_DIALOG_DATA) public data: {cad: CadViewer; index: number}
	) {}

	ngOnInit() {
		const dimension = this.data.cad.data.dimensions[this.data.index];
		this.dimension = dimension;
		this.form = this.fb.group({
			mingzi: [dimension.mingzi],
			qujian: [dimension.qujian, [this.qujianValidator()]],
			e1Location: dimension.entity1?.location,
			e2Location: dimension.entity2?.location,
			axis: dimension.axis,
			distance: dimension.distance,
			fontSize: dimension.fontSize,
			cad1: new FormControl({value: dimension.cad1, disabled: true}),
			cad2: new FormControl({value: dimension.cad2, disabled: true})
		});
	}

	submit() {
		if (this.form.valid) {
			const value = this.form.value;
			const dimension = this.dimension;
			dimension.mingzi = value.mingzi;
			dimension.qujian = value.qujian;
			dimension.entity1.location = value.e1Location;
			dimension.entity2.location = value.e2Location;
			dimension.axis = value.axis;
			dimension.distance = value.distance;
			dimension.fontSize = value.fontSize;
			this.close();
		}
	}

	close() {
		this.dialogRef.close(this.data.cad.exportData().dimensions[this.data.index]);
	}

	mqValidator(): ValidatorFn {
		return () => {
			if (!this.form) {
				return null;
			}
			const controls = this.form.controls;
			if (controls.qujian.value || controls.mingzi.value) {
				return null;
			}
			return {mqNull: "区间和名字不能同时为空"};
		};
	}

	qujianValidator(): ValidatorFn {
		return (control: AbstractControl) => {
			const err = {qujian: "区间应有且仅有一个~或-，且该符号不位于开头或结尾。"};
			return !control.value || control.value.match(/^[^-~]+(-|~)[^-~]+$/) ? null : err;
		};
	}

	checkMqNull() {
		const controls = this.form.controls;
		if (controls.mingzi.hasError("mqNull")) {
			return controls.mingzi.errors.mqNull;
		}
		if (controls.qujian.hasError("mqNull")) {
			return controls.qujian.errors.mqNull;
		}
		return "";
	}

	checkQujian() {
		return this.form.controls.qujian.errors?.qujian;
	}
}
