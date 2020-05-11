import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {CadLine, CadTransformation, CadEntity, CadEntities, CadArc} from "@app/cad-viewer/cad-data";
import {Vector2, MathUtils} from "three";
import {getColorLightness} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent implements OnInit {
	@Input() menu: CadMenu;
	line: CadLine;
	tLine: {start: Vector2; end: Vector2};
	get data() {
		return this.menu.getData();
	}
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	constructor() {}

	ngOnInit() {
		const {cad, mode} = this.menu;
		cad.controls.on("entityselect", (event, entity) => {
			if (mode.type === "normal" && entity instanceof CadLine) {
				this.line = entity;
				this.updateTLine();
			}
		});
		cad.controls.on("drag", () => this.updateTLine());
		cad.controls.on("wheel", () => this.updateTLine());
	}

	expandLine(line: CadLine, d: number) {
		const theta = line.theta;
		const translate = new Vector2(Math.cos(theta), Math.sin(theta)).multiplyScalar(d);
		line.end.add(translate);
		return translate;
	}

	setLineLength(event: InputEvent) {
		const {line, menu} = this;
		menu.updatePointsMap();
		const entities = this.findAllAdjacentLines(line, line.end);
		const length = Number((event.target as HTMLInputElement).value);
		const d = line.length - length;
		const translate = this.expandLine(line, d);
		entities.transform(new CadTransformation({translate}));
		menu.getData().updatePartners().updateComponents();
		menu.cad.render();
		menu.updateCadLength();
		this.updateTLine();
	}

	findAdjacentLines(entity: CadEntity, point?: Vector2): CadEntity[] {
		const {pointsMap, accuracy} = this.menu;
		if (!point && entity instanceof CadLine) {
			const adjStart = this.findAdjacentLines(entity, entity.start);
			const adjEnd = this.findAdjacentLines(entity, entity.end);
			return [...adjStart, ...adjEnd];
		}
		const pal = pointsMap.find((v) => v.point.distanceTo(point) <= accuracy);
		if (pal) {
			const lines = pal.lines.filter((v) => v.id !== entity.id);
			return lines;
		}
		return [];
	}

	findAllAdjacentLines(entity: CadEntity, point: Vector2) {
		const entities = new CadEntities();
		const id = entity.id;
		const accuracy = this.menu.accuracy;
		while (entity && point) {
			entity = this.findAdjacentLines(entity, point)[0];
			if (entity?.id === id) {
				break;
			}
			if (entity) {
				if (entity instanceof CadLine) {
					entities.line.push(entity);
					const {start, end} = entity;
					if (start.distanceTo(point) <= accuracy) {
						point = end;
					} else if (end.distanceTo(point) < accuracy) {
						point = start;
					} else {
						point = null;
					}
				}
				if (entity instanceof CadArc) {
					entities.arc.push(entity);
					const curve = entity.curve;
					const start = curve.getPoint(0);
					const end = curve.getPoint(1);
					if (start.distanceTo(point) <= accuracy) {
						point = end;
					} else if (end.distanceTo(point) <= accuracy) {
						point = start;
					} else {
						point = null;
					}
				}
			}
		}
		return entities;
	}

	getCssColor(color?: string) {
		if (color) {
			return getColorLightness(color) < 0.5 ? "black" : "white";
		} else if (this.line) {
			return "#" + this.line.color.toString(16).padStart(6, "0");
		}
		return "white";
	}

	setLineColor(event: MatSelectChange) {
		if (this.line) {
			const color = parseInt(event.value.slice("1"), 16);
			this.line.color = color;
			this.menu.cad.render();
		}
	}

	setLineText(event: Event, field: string) {
		if (this.line) {
			const value = (event.target as HTMLInputElement).value;
			this.line[field] = value;
			this.menu.cad.render();
		}
	}

	updateTLine() {
		if (this.line) {
			const start = this.menu.cad.translatePoint(this.line.start);
			const end = this.menu.cad.translatePoint(this.line.end);
			this.tLine = {start, end};
		}
	}
}
