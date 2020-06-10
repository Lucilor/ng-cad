import {Component, OnInit, Input} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {Color} from "three";
import {ColorPickerEventArgs} from "@syncfusion/ej2-angular-inputs";
import {CadMtext} from "@src/app/cad-viewer/cad-data/cad-entity/cad-mtext";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../../alert/alert.component";

@Component({
	selector: "app-cad-mtext",
	templateUrl: "./cad-mtext.component.html",
	styleUrls: ["./cad-mtext.component.scss"]
})
export class CadMtextComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	get selected() {
		return this.cad.selectedEntities.mtext;
	}

	constructor() {}

	ngOnInit() {}

	getInfo(field: string) {
		const selected = this.selected;
		if (selected.length === 1) {
			return selected[0][field];
		}
		if (selected.length) {
			const texts = Array.from(new Set(selected.map((v) => v[field])));
			if (texts.length === 1) {
				return texts[0];
			}
			return "多个值";
		}
		return "";
	}

	setInfo(field: string, event: InputEvent) {
		const value = (event.target as HTMLInputElement).value;
		this.selected.forEach((e) => (e[field] = value));
		this.cad.render();
	}

	getColor() {
		const selected = this.selected;
		let color: Color;
		if (selected.length === 1) {
			color = selected[0].color;
		}
		if (selected.length) {
			const texts = Array.from(new Set(selected.map((v) => v.color.getHex())));
			if (texts.length === 1) {
				color = selected[0].color;
			} else {
				color = new Color();
			}
		}
		return "#" + color.getHexString();
	}

	setColor(event: ColorPickerEventArgs) {
		const value = event.currentValue.hex;
		this.selected.forEach((e) => e.color.set(value));
		this.cad.render();
	}

	addMtext() {
		const data = this.currCads[0];
		const cad = this.cad;
		const mtext = new CadMtext();
		const {x, y} = cad.position;
		mtext.insert.set(x, y);
		mtext.anchor.set(0.5, 0.5);
		mtext.text = "新建文本";
		data.entities.mtext.push(mtext);
		cad.render(false, new CadEntities().add(mtext));
		cad.unselectAll();
		cad.objects[mtext.id].userData.selected = true;
		cad.render(false, new CadEntities().add(mtext));
	}

	cloneMtexts() {
		const data = this.currCads[0];
		this.selected.forEach((mtext) => {
			const newText = mtext.clone(true);
			data.entities.mtext.push(newText);
		});
		this.cad.render();
	}
}
