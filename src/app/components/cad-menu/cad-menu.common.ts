import {CadData, CadLine, cadTypes, CadEntity, CadOption, CadBaseLine, CadJointPoint, CadDimension} from "@app/cad-viewer/cad-data";
import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {Line, Material, Mesh} from "three";
import {Angle, Arc, Point} from "@lucilor/utils";

const emptyData = new CadData();
interface Mode {
	type: "normal" | "baseLine" | "dimension" | "jointPoint";
	index: number;
}

interface LinesAtPoint {
	point: Point;
	tPoint: Point;
	lines: CadEntity[];
	selected: boolean;
}

export class CadMenu {
	cad: CadViewer;
	multi?: boolean;
	dialog: MatDialog;
	entity: CadLine;
	mode: Mode;
	line: number;
	dimension: string;
	cadIdx = 0;
	partner: string;
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	readonly accuracy = 0.01;
	pointsMap: LinesAtPoint[];

	constructor(dialog: MatDialog, cad: CadViewer, multi = false) {
		this.cad = cad;
		this.dialog = dialog;
		this.mode = {type: "normal", index: 0};
		this.multi = multi;
	}

	initData() {
		if (this.multi) {
			this.cad.data.components.data.forEach((d, i) => {
				this.setData(d, i);
			});
		} else {
			this.setData(this.cad.data, 0);
		}
	}

	getData(cadIdx = this.cadIdx) {
		const {multi, cad} = this;
		return (multi ? cad.data.components.data[cadIdx] : cad.data) || emptyData;
	}

	setData(d: CadData, cadIdx: number) {
		if (d.options.length < 1) {
			this.addOption(0, cadIdx);
		}
		if (d.conditions.length < 1) {
			this.addCondition(0, cadIdx);
		}
		if (d.baseLines.length < 1) {
			this.addBaseLine(0, cadIdx);
		}
		if (d.jointPoints.length < 1) {
			this.addJointPoint(0, cadIdx);
		}
		if (d.entities.dimension.length < 1) {
			this.addDimension(0, cadIdx);
		}
	}

	addOption(i: number, cadIdx = this.cadIdx) {
		this.getData(cadIdx).options.splice(i + 1, 0, new CadOption());
	}
	async removeOption(i: number, cadIdx = this.cadIdx) {
		if ((await this._beforeRemove()) === true) {
			const arr = this.getData(cadIdx).options;
			if (arr.length === 1) {
				arr[0] = new CadOption();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addCondition(i: number, cadIdx = this.cadIdx) {
		this.getData(cadIdx).conditions.splice(i + 1, 0, "");
	}
	async removeCondition(i: number, cadIdx = this.cadIdx) {
		if ((await this._beforeRemove()) === true) {
			const arr = this.getData(cadIdx).conditions;
			if (arr.length === 1) {
				arr[0] = "";
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addBaseLine(i: number, cadIdx = this.cadIdx) {
		this.getData(cadIdx).baseLines.splice(i + 1, 0, new CadBaseLine());
	}
	async removeBaseLine(i: number, cadIdx = this.cadIdx) {
		if ((await this._beforeRemove()) === true) {
			const arr = this.getData(cadIdx).baseLines;
			if (arr.length === 1) {
				arr[0] = new CadBaseLine();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addJointPoint(i: number, cadIdx = this.cadIdx) {
		this.getData(cadIdx).jointPoints.splice(i + 1, 0, new CadJointPoint());
	}
	async removeJointPoint(i: number, cadIdx = this.cadIdx) {
		if ((await this._beforeRemove()) === true) {
			const arr = this.getData(cadIdx).jointPoints;
			if (arr.length === 1) {
				arr[0] = new CadJointPoint();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addDimension(i: number, cadIdx = this.cadIdx) {
		this.getData(cadIdx).entities.dimension.splice(i + 1, 0, new CadDimension());
	}
	async removeDimension(i: number, cadIdx = this.cadIdx) {
		if ((await this._beforeRemove()) === true) {
			const arr = this.getData(cadIdx).entities.dimension;
			if (arr.length === 1) {
				arr[0] = new CadDimension();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	selectLineBegin(type: Mode["type"], index: number) {
		const cad = this.cad;
		const entities = this.cad.data.entities;
		const ids = entities.line.map((e) => e.id);
		entities.line.forEach((e) => {
			const object = cad.objects[e.id] as Line;
			if (object) {
				const material = object.material as Material;
				const slope = e.start[1] / e.end[1] / (e.start[0] / e.end[0]);
				const flag = type.includes("dimension") ? true : slope === 0 || !isFinite(slope);
				if ((type.includes("dimension") || ids.includes(e.id)) && flag) {
					material.opacity = 1;
					object.userData.selectable = true;
				} else {
					material.opacity = 0.3;
					object.userData.selectable = false;
				}
			}
		});
		Object.values(cadTypes).forEach((type) => {
			if (type === "line") {
				return;
			}
			(entities[type] as CadEntity[]).forEach((e) => {
				const object = cad.objects[e.id] as Mesh;
				if (object) {
					const material = object.material as Material;
					material.opacity = 0.3;
					object.userData.selectable = false;
				}
			});
		});
		this.mode.type = type;
		this.mode.index = index;
		cad.config.selectedColor = 0x0000ff;
		cad.config.hoverColor = 0x00ffff;
		cad.render();
	}

	selectLineEnd() {
		const {cad} = this;
		const entities = this.cad.data.entities;
		Object.values(cadTypes).forEach((type) => {
			(entities[type] as CadEntity[]).forEach((e) => {
				const object = cad.objects[e.id] as Mesh;
				if (object) {
					const material = object.material as Material;
					material.opacity = 0.3;
					object.userData.selectable = true;
					object.userData.selected = false;
				}
			});
		});
		cad.config.selectedColor = null;
		cad.config.hoverColor = null;
		cad.render();
		this.mode.type = "normal";
	}

	selectBaseline(i: number) {
		const {mode, cad} = this;
		if (mode.type === "baseLine" && mode.index === i) {
			this.selectLineEnd();
		} else {
			// const data = multi?cad.data.components.data[cadIdx]
			const {idX, idY} = this.getData().baseLines[i];
			Object.values(cadTypes).forEach((type) => {
				(cad.data.entities[type] as CadEntity[]).forEach((e) => {
					const object = cad.objects[e.id] as Mesh;
					if (object) {
						object.userData.selected = [idX, idY].includes(e.id);
					}
				});
			});
			this.selectLineBegin("baseLine", i);
		}
	}

	selectJointPoint(i: number) {
		const {mode} = this;
		if (mode.type === "jointPoint" && mode.index === i) {
			this.selectLineEnd();
		} else {
			mode.type = "jointPoint";
			mode.index = i;
			this.generatePointsMap();
		}
	}

	onJointPointClick(i: number) {
		const {pointsMap, mode} = this;
		pointsMap.forEach((v, j) => (v.selected = i === j));
		const index = mode.index;
		const point = pointsMap[i].point;
		const jointPoint = this.getData().jointPoints[index];
		jointPoint.valueX = point.x;
		jointPoint.valueY = point.y;
		// const vJointPoint = vCad.data.jointPoints[vIdx + index];
		// vJointPoint.valueX = point.x;
		// vJointPoint.valueY = point.y;
	}

	private generatePointsMap() {
		const {cad, accuracy} = this;
		if (!this.cad) {
			this.pointsMap = [];
			return;
		}
		const pointsMap: LinesAtPoint[] = [];
		const addToMap = (point: Point, line: CadEntity) => {
			const linesAtPoint = pointsMap.find((v) => v.point.equalsAppr(point, accuracy));
			if (linesAtPoint) {
				linesAtPoint.lines.push(line);
			} else {
				pointsMap.push({point, lines: [line], tPoint: new Point(), selected: false});
			}
		};
		// const entities = vCad.flatEntities().slice(vIdx, vIdx + cad.flatEntities().length);
		cad.data.entities.line.forEach((entity) => {
			const start = new Point(entity.start);
			const end = new Point(entity.end);
			if (start.distance(end) > 0) {
				addToMap(start, entity);
				addToMap(end, entity);
			}
		});
		cad.data.entities.arc.forEach((entity) => {
			const start = new Angle(entity.start_angle, "deg");
			const end = new Angle(entity.end_angle, "deg");
			const arc = new Arc(new Point(entity.center), entity.radius, start, end, entity.clockwise);
			if (arc.length > 0) {
				addToMap(arc.startPoint, entity);
				addToMap(arc.endPoint, entity);
			}
		});
		this.pointsMap = pointsMap;
	}

	private _beforeRemove() {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		return new Promise((r) => {
			ref.afterClosed().subscribe((res) => {
				r(res);
			});
		});
	}
}
