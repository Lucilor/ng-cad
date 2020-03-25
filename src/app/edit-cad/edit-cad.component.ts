import {Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "../cad-data.service";
import {CadData, CadViewer, Events, CadEntity, CadTypes, CadLine, CadArc} from "@lucilor/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {Line, Point, Angle, Arc, getColorLightness} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";

interface Mode {
	type: "normal" | "baseLine" | "dimension1" | "dimension2" | "jointPoint";
	index: number;
}

interface LinesAtPoint {
	point: Point;
	tPoint: Point;
	lines: CadEntity[];
	selected: boolean;
}

@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"]
})
export class EditCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	status: {entity: CadLine; mode: Mode; line: Line};
	pointsMap: LinesAtPoint[];
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	readonly accuracy = 0.01;
	constructor(
		private route: ActivatedRoute,
		private dataService: CadDataService,
		private dialog: MatDialog,
		private cd: ChangeDetectorRef
	) {
		this.cad = new CadViewer({entities: [], layers: [], name: ""});
		this.status = {entity: null, mode: {type: "normal", index: -1}, line: new Line(new Point())};
	}

	async ngAfterViewInit() {
		document.title = "编辑CAD";
		let currentFragment: CadData;
		const params = this.route.snapshot.queryParams;
		if (params.data) {
			currentFragment = await this.dataService.getCadData(params.encode, params.data);
		} else {
			currentFragment = this.dataService.currentFragment;
		}
		if (!currentFragment) {
			this.dialog.open(AlertComponent, {data: {content: "没有cad数据。"}});
			return null;
		}
		currentFragment.entities.forEach(e => (e.selectable = true));
		const cad = new CadViewer(currentFragment, innerWidth, innerHeight, {
			padding: [40, 380, 40, 150],
			showLineLength: 8,
			selectMode: "single",
			backgroundColor: 0
		})
			.enableDragging()
			.enableWheeling()
			.enableKeyboard();
		this.cad = cad;
		this.selectLineEnd();
		this.cadContainer.nativeElement.append(cad.view);
		document.title += " - " + cad.data.name;
		cad.on(Events.entityclick, (event: PIXI.interaction.InteractionEvent, entity: CadEntity) => {
			const {status} = this;
			this.setPoints();
			if (entity.type === CadTypes.Arc) {
				this.setPoints();
			}
			if (entity.type === CadTypes.Line) {
				const lineEntity = entity as CadLine;
				this.status.entity = lineEntity;
				const line = new Line(new Point(lineEntity.start), new Point(lineEntity.end));
				// if (lineController.enabled && this.status.mode.type === "normal") {
				// 	lineController.setLine(entity as CadLine);
				// 	lineController.show();
				// 	const length = num2Str(line.length);
				// 	const {mingzi, qujian, gongshi} = entity as CadLine;
				// 	layui.form.val("line-info", {length, mingzi, qujian, gongshi});
				// }
				if (status.mode.type === "baseLine") {
					const index = status.mode.index;
					if (line.slope === 0) {
						cad.data.baseLines[index].idY = entity.selected ? entity.id : null;
					}
					if (!isFinite(line.slope)) {
						cad.data.baseLines[index].idX = entity.selected ? entity.id : null;
					}
					cad.calculateBaseLines(index);
					const baseLine = cad.data.baseLines[index];
					// const {valueX: x, valueY: y} = baseLine;
					// const div = $(".base-line").eq(index);
					// div.find(".base-x-value").text(typeof x === "number" ? x.toFixed(2) : "");
					// div.find(".base-y-value").text(typeof y === "number" ? y.toFixed(2) : "");
					// this._verifyInput(div, ["base-x-value", "base-y-value"]);
					cad.data.entities.forEach(e => (e.selected = [baseLine.idX, baseLine.idY].includes(e.id)));
					cad.render();
				}
				if (status.mode.type.includes("dimension")) {
					const dimension = cad.data.dimensions[status.mode.index];
					if (status.mode.type === "dimension1") {
						dimension.entity1.id = entity.id;
					}
					if (status.mode.type === "dimension2") {
						dimension.entity2.id = entity.id;
					}
				}
			}
		});
		cad.on(Events.drag, () => {
			this.setPoints();
		});
		cad.on(Events.wheel, () => {
			this.setPoints();
		});
		cad.render(true)
			.drawDimensions()
			.render(true);
		if (cad.data.baseLines.length < 1) {
			cad.data.baseLines.push({name: "", idX: "", idY: ""});
		}
		this.cd.detectChanges();
		this.generatePointsMap();
		window["view"] = this;
	}

	flip(vertical: boolean, horizontal: boolean) {
		this.cad.flip(vertical, horizontal).render(true);
	}

	rotate(clockwise?: boolean) {
		if (clockwise === true) {
			this.cad.rotate(-Math.PI / 2);
		} else if (clockwise === false) {
			this.cad.rotate(Math.PI / 2);
		} else {
			this.cad.rotate(Math.PI / 2);
		}
		this.cad.render(true);
	}

	addOption(i: number) {
		this.cad.data.options.splice(i + 1, 0, {name: "", value: ""});
	}

	removeOption(i: number) {
		this.cad.data.options.splice(i, 1);
	}

	addCondition(i: number) {
		this.cad.data.conditions.splice(i + 1, 0, "");
	}

	removeCondition(i: number) {
		this.cad.data.conditions.splice(i, 1);
	}

	selectBaseline(i: number) {
		const {status, cad} = this;
		if (status.mode.type === "baseLine" && status.mode.index === i) {
			this.selectLineEnd();
		} else {
			status.mode.index = i;
			const {idX, idY} = cad.data.baseLines[i];
			cad.data.entities.forEach(e => (e.selected = [idX, idY].includes(e.id)));
			this.selectLineBegin("baseLine");
		}
	}

	addBaseline(i: number) {
		this.cad.data.baseLines.splice(i + 1, 0, {name: "", idX: "", idY: ""});
	}

	removeBaseline(i: number) {
		this.cad.data.baseLines.splice(i, 1);
	}

	selectJointPoint(i: number) {
		const {cad, status, pointsMap} = this;
		if (status.mode.type === "jointPoint" && status.mode.index === i) {
			this.selectLineEnd();
		} else {
			status.mode.type = "jointPoint";
			status.mode.index = i;
			const jointPoint = cad.data.jointPoints[i];
			console.log(pointsMap);
			// this.pointsMap.forEach(v => {
			// 	const point = $(`<div class="point joint-point"></div>`);
			// 	div.append(point);
			// 	const {x, y} = v.point;
			// 	point.on("click", () => {
			// 		const jointPointDiv = document.querySelectorAll(".joint-point").item(i);
			// 		const input = jointPointDiv.querySelector("input");
			// 		if (point.hasClass("selected")) {
			// 			point.removeClass("selected");
			// 			jointPointDiv.querySelector(".joint-x-value").textContent = "";
			// 			jointPointDiv.querySelector(".joint-y-value").textContent = "";
			// 			cad.data.jointPoints[i].valueX = 0;
			// 			cad.data.jointPoints[i].valueY = 0;
			// 			input.required = false;
			// 			input.removeAttribute("lay-verify");
			// 		} else {
			// 			this.dom.find(".joint-point").each(function() {
			// 				$(this).removeClass("selected");
			// 			});
			// 			point.addClass("selected");
			// 			jointPointDiv.querySelector(".joint-x-value").textContent = x.toFixed(2);
			// 			jointPointDiv.querySelector(".joint-y-value").textContent = y.toFixed(2);
			// 			cad.data.jointPoints[i].valueX = x;
			// 			cad.data.jointPoints[i].valueY = y;
			// 			input.required = true;
			// 			input.setAttribute("lay-verify", "required");
			// 		}
			// 	});
			// 	if (x === jointPoint.valueX && y === jointPoint.valueY) {
			// 		point.addClass("selected");
			// 	}
			// 	this._setPoint(point, v.point);
			// });
			// this.status.jointPoint = true;
			// this.status.jointPointIndex = i;
		}
	}

	onJointPointClick(event: Event) {
		const target = event.target as HTMLDivElement;
		// if(target.classList.contains("sele"))
	}

	addJointPoint(i: number) {
		this.cad.data.jointPoints.splice(i + 1, 0, {name: ""});
	}

	removeJointPoint(i: number) {
		this.cad.data.jointPoints.splice(i, 1);
	}

	submit() {
		console.log(this.cad.exportData());
	}

	selectLineBegin(type: Mode["type"]) {
		const cad = this.cad;
		// this.lineController.hide();
		cad.data.entities.forEach(e => {
			if (e.container) {
				if (e.type === CadTypes.Line) {
					const le = e as CadLine;
					const slope = new Line(new Point(le.start), new Point(le.end)).slope;
					if (slope === 0 || !isFinite(slope)) {
						e.container.alpha = 1;
						e.selectable = true;
					} else {
						e.container.alpha = 0.3;
						e.selectable = false;
					}
				} else {
					e.container.alpha = 0.3;
					e.selectable = false;
				}
			}
		});
		this.status.mode.type = type;
		cad.config.selectedColor = 0x0000ff;
		cad.config.hoverColor = 0x00ffff;
		cad.render();
	}

	selectLineEnd() {
		const {cad} = this;
		cad.data.entities.forEach(e => {
			if (e.container) {
				e.container.alpha = 1;
				e.selected = false;
				e.selectable = true;
			}
		});
		cad.config.selectedColor = null;
		cad.config.hoverColor = null;
		cad.render();
		this.status.mode.type = "normal";
		// lineController.show();
	}

	setPoints() {
		const {cad, status} = this;
		if (!status.entity) {
			return;
		}
		if (status.entity.type === CadTypes.Arc) {
			status.line = new Line(new Point());
		}
		if (status.entity.type === CadTypes.Line) {
			const entity = status.entity as CadLine;
			const start = cad.translatePoint(new Point(entity.start));
			const end = cad.translatePoint(new Point(entity.end));
			status.line = new Line(start, end);
		}
	}

	getEntityLength() {
		const {status} = this;
		if (status.entity && status.entity.type === CadTypes.Line) {
			const entity = status.entity as CadLine;
			const line = new Line(new Point(entity.start), new Point(entity.end));
			return line.length;
		}
		return "";
	}

	setEntityLength(event: Event) {
		const {cad, status} = this;
		if (status.entity && status.entity.type === CadTypes.Line) {
			const entity = status.entity as CadLine;
			const length = Number((event.target as HTMLInputElement).value);
			const line = new Line(new Point(entity.start), new Point(entity.end));
			const d = length - line.length;
			const angle = line.theta;
			const offset = new Point(Math.cos(angle), Math.sin(angle)).multiply(d);
			entity.end[0] += offset.x;
			entity.end[1] += offset.y;
			cad.drawLine(entity);
			this.generatePointsMap();
			const lines = this.findAllAdjacentLines(entity, line.end);
			lines.forEach(e => {
				if (e.type === CadTypes.Line) {
					const l = e as CadLine;
					l.start[0] += offset.x;
					l.start[1] += offset.y;
					l.end[0] += offset.x;
					l.end[1] += offset.y;
					cad.render();
				}
				if (e.type === CadTypes.Arc) {
					const a = e as CadArc;
					a.center[0] += offset.x;
					a.center[1] += offset.y;
					cad.render();
				}
			});
			this.setPoints();
		}
	}

	getCssColor(color?: string) {
		if (color) {
			return getColorLightness(color) < 0.5 ? "black" : "white";
		} else if (typeof this.status.entity?.colorRGB === "number") {
			return "#" + this.status.entity.colorRGB.toString(16).padStart(6, "0");
		}
		return "white";
	}

	setEntityColor(event: MatSelectChange) {
		if (this.status.entity) {
			this.status.entity.colorRGB = parseInt(event.value.slice("1"), 16);
			this.cad.render();
		}
	}

	private generatePointsMap() {
		const pointsMap: LinesAtPoint[] = [];
		const addToMap = (point: Point, line: CadEntity) => {
			const linesAtPoint = pointsMap.find(v => v.point.equalsAppr(point, this.accuracy));
			if (linesAtPoint) {
				linesAtPoint.lines.push(line);
			} else {
				pointsMap.push({point, lines: [line], tPoint: this.cad.translatePoint(point), selected: false});
			}
		};
		const entities = this.cad.data.entities;
		for (const entity of entities) {
			if (entity.type === CadTypes.Line) {
				const lineEntity = entity as CadLine;
				const line = new Line(new Point(lineEntity.start), new Point(lineEntity.end));
				if (line.length > 0) {
					addToMap(line.start, entity);
					addToMap(line.end, entity);
				}
			}
			if (entity.type === CadTypes.Arc) {
				const arcEntity = entity as CadArc;
				const start = new Angle(arcEntity.start_angle, "deg");
				const end = new Angle(arcEntity.end_angle, "deg");
				const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, start, end, arcEntity.clockwise);
				if (arc.length > 0) {
					addToMap(arc.startPoint, entity);
					addToMap(arc.endPoint, entity);
				}
			}
		}
		this.pointsMap = pointsMap;
	}

	private findAdjacentLines(entity: CadEntity, point?: Point): CadEntity[] {
		if (!point) {
			if (entity.type === CadTypes.Line) {
				const start = new Point((entity as CadLine).start);
				const end = new Point((entity as CadLine).end);
				const adjStart = this.findAdjacentLines(entity, start);
				const adjEnd = this.findAdjacentLines(entity, end);
				return [...adjStart, ...adjEnd];
			}
		}
		const pal = this.pointsMap.find(v => v.point.equalsAppr(point, this.accuracy));
		if (pal) {
			const lines = pal.lines.filter(v => v !== entity);
			return lines;
		}
		return [];
	}

	private findAllAdjacentLines(entity: CadEntity, point: Point) {
		const lines: CadEntity[] = [];
		while (entity && point) {
			entity = this.findAdjacentLines(entity, point)[0];
			if (entity) {
				if (entity.type === CadTypes.Line) {
					lines.push(entity);
					const start = new Point((entity as CadLine).start);
					const end = new Point((entity as CadLine).end);
					if (start.equalsAppr(point, this.accuracy)) {
						point = end;
					} else if (end.equalsAppr(point, this.accuracy)) {
						point = start;
					} else {
						point = null;
					}
				}
				if (entity.type === CadTypes.Arc) {
					lines.push(entity);
					const arcEntity = entity as CadArc;
					const starta = new Angle(arcEntity.start_angle, "deg");
					const enda = new Angle(arcEntity.end_angle, "deg");
					const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, starta, enda, arcEntity.clockwise);
					const start = arc.startPoint;
					const end = arc.endPoint;
					if (start.equalsAppr(point, this.accuracy)) {
						point = end;
					} else if (end.equalsAppr(point, this.accuracy)) {
						point = start;
					} else {
						point = null;
					}
				}
			}
		}
		return lines;
	}

	setEntityText(event: Event, field: string) {
		const entity = this.status.entity as CadLine;
		if (!entity || entity.type !== CadTypes.Line) {
			return;
		}
		entity[field] = (event.target as HTMLInputElement).value;
	}
}
