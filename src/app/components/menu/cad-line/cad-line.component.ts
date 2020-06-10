import {Component, OnInit, Input} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {Vector2, Color} from "three";
import {CadArc} from "@src/app/cad-viewer/cad-data/cad-entity/cad-arc";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {findAllAdjacentLines, generatePointsMap} from "@src/app/cad-viewer/cad-data/cad-lines";
import {getColorLightness} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent implements OnInit {
	@Input() cad: CadViewer;
	get selectedLines() {
		const {line, arc} = this.cad.selectedEntities;
		return [...line, ...arc];
	}
	focusedField = "";
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];

	constructor() {}

	ngOnInit() {}

	expandLine(line: CadLine, d: number) {
		const theta = line.theta;
		const translate = new Vector2(Math.cos(theta), Math.sin(theta)).multiplyScalar(d);
		line.end.add(translate);
		return translate;
	}

	getLineLength() {
		const lines = this.selectedLines;
		if (lines.length === 1) {
			const line = lines[0];
			if (line instanceof CadLine) {
				return line.length.toFixed(2);
			} else if (line instanceof CadArc) {
				return line.curve.getLength().toFixed(2);
			}
		}
		return "";
	}

	setLineLength(event: InputEvent) {
		const {selectedLines, cad} = this;
		const pointsMap = generatePointsMap(cad.data.getAllEntities());
		selectedLines.forEach((line) => {
			if (line instanceof CadLine) {
				const {entities, closed} = findAllAdjacentLines(pointsMap, line, line.end);
				const length = Number((event.target as HTMLInputElement).value);
				const d = line.length - length;
				const translate = this.expandLine(line, d);
				entities.forEach((e) => e.transform(new CadTransformation({translate})));
			}
		});
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	getCssColor(colorStr?: string) {
		const lines = this.selectedLines;
		if (colorStr) {
			const color = new Color(colorStr);
			return getColorLightness(color.getHex()) < 0.5 ? "black" : "white";
		}
		if (lines.length === 1) {
			return "#" + lines[0].color.getHexString();
		}
		if (lines.length) {
			const strs = Array.from(new Set(lines.map((l) => "#" + l.color.getHexString())));
			if (strs.length === 1) {
				return strs[0];
			}
		}
		return "white";
	}

	setLineColor(event: MatSelectChange) {
		const color = parseInt(event.value.slice("1"), 16);
		this.selectedLines.forEach((e) => e.color.set(color));
		this.cad.render();
	}

	getLineText(field: "mingzi" | "qujian" | "gongshi" | "guanlianbianhuagongshi") {
		const lines = this.selectedLines;
		if (lines.length === 1) {
			return lines[0][field];
		}
		if (lines.length) {
			const texts = Array.from(new Set(lines.map((l) => l[field])));
			if (texts.length === 1) {
				return texts[0];
			}
			return field === this.focusedField ? "" : "多个值";
		}
		return "";
	}

	setLineText(event: InputEvent, field: string) {
		const value = (event.target as HTMLInputElement).value;
		this.selectedLines.forEach((e) => {
			if (e instanceof CadLine) {
				e[field] = value;
			}
		});
	}
}
