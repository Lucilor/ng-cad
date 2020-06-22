import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {CadMtext} from "@src/app/cad-viewer/cad-data/cad-entity/cad-mtext";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {Color} from "three";
import {ColorPickerEventArgs} from "@syncfusion/ej2-angular-inputs";

@Component({
	selector: "app-cad-mtext",
	templateUrl: "./cad-mtext.component.html",
	styleUrls: ["./cad-mtext.component.scss"]
})
export class CadMtextComponent implements OnInit {
	@Input() menu: CadMenu;
	get selected() {
		return this.menu.cad.selectedEntities.mtext;
	}
	constructor() {}

	ngOnInit(): void {}

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
		this.menu.cad.render();
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
		this.menu.cad.render();
	}

	addMtext() {
		const data = this.menu.getData();
		const cad = this.menu.cad;
		const mtext = new CadMtext();
		mtext.font_size = 36;
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
		const data = this.menu.getData();
		this.selected.forEach((mtext) => {
			const newText = mtext.clone(true);
			data.entities.mtext.push(newText);
		});
		this.menu.cad.render();
	}
}
