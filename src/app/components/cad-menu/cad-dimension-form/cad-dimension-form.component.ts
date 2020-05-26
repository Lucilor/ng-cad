import {Component, OnInit, Inject} from "@angular/core";
import {FormGroup, FormBuilder, FormControl, ValidatorFn, AbstractControl} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";

@Component({
	selector: "app-cad-dimension-form",
	templateUrl: "./cad-dimension-form.component.html",
	styleUrls: ["./cad-dimension-form.component.scss"]
})
export class CadDimensionFormComponent implements OnInit {
	form: FormGroup;
	dimension: CadDimension;
	constructor(
		private fb: FormBuilder,
		public dialogRef: MatDialogRef<CadDimensionFormComponent>,
		@Inject(MAT_DIALOG_DATA) public data: {data: CadDimension}
	) {}

	ngOnInit() {
		const dimension = this.data.data;
		this.dimension = this.data.data;
		this.form = this.fb.group({
			mingzi: [dimension.mingzi],
			qujian: [dimension.qujian, [this.qujianValidator()]],
			e1Location: dimension.entity1?.location,
			e2Location: dimension.entity2?.location,
			axis: dimension.axis,
			distance: dimension.distance,
			fontSize: dimension.font_size,
			cad1: new FormControl({value: dimension.cad1 || " ", disabled: true}),
			cad2: new FormControl({value: dimension.cad2 || " ", disabled: true})
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
			dimension.font_size = value.fontSize;
			this.close();
		} else {
			this.form.controls.qujian.updateValueAndValidity();
		}
	}

	close() {
		this.dialogRef.close(this.dimension);
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
