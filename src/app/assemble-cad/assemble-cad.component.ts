import {Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef} from "@angular/core";
import {CadViewer, CadData, Events, CadEntity, ComponentPosition, CadTypes, CadLine, Dimension} from "@lucilor/cad-viewer";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "../cad-data.service";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {Angle, Line, Point} from "@lucilor/utils";
import {cloneDeep} from "lodash";
import {DimFormComponent} from "../edit-cad/dim-form.component";

interface Mode {
	type: "normal" | "assemble" | "dimension1" | "dimension2";
	index: number;
}

@Component({
	selector: "app-assemble-cad",
	templateUrl: "./assemble-cad.component.html",
	styleUrls: ["./assemble-cad.component.scss"],
})
export class AssembleCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	rotateAngle: number;
	components: {name: string; img: string}[];
	options: {space: string; position: ComponentPosition};
	status: {names: string[]; lines: string[]; mode: Mode; activeComponent: string; dimension?: Dimension};
	dimNameFocus = -1;
	private initVals = {
		options: {name: "", value: ""},
		conditions: "",
		baseLines: {name: "", idX: "", idY: ""},
		jointPoints: {name: "", valueX: null, valueY: null},
		dimensions: {
			axis: "x",
			entity1: {id: "", location: "start"},
			entity2: {id: "", location: "end"},
			distance: 16,
			fontSize: 16,
			dimstyle: "",
		},
	};
	constructor(
		private route: ActivatedRoute,
		private dataService: CadDataService,
		private dialog: MatDialog,
		private cd: ChangeDetectorRef
	) {
		this.status = {names: [], lines: [], mode: {type: "normal", index: -1}, activeComponent: null};
		this.components = [];
		this.options = {space: "", position: "absolute"};
		// tslint:disable-next-line
		window["view"] = this;
	}

	async ngAfterViewInit() {
		document.title = "装配CAD";
		let data: CadData;
		const params = this.route.snapshot.queryParams;
		if (params.data) {
			data = (await this.dataService.getCadData(params.encode, params.data))[0];
		} else {
			data = this.dataService.currentFragment;
		}
		if (!data) {
			this.dialog.open(AlertComponent, {data: {content: "没有cad数据。"}});
			return null;
		}
		const cad = new CadViewer(data, innerWidth, innerHeight, {
			backgroundColor: 0,
			padding: [40, 416, 40, 150],
			selectMode: "none",
			selectedColor: 0x0000ff,
			drawDimensions: true,
			// drawMText: true
		}).render(true);
		cad.enableDragging().enableWheeling().enableKeyboard();
		this.cad = cad;
		cad.on(Events.entityclick, (event: PIXI.interaction.InteractionEvent, entity: CadEntity) => {
			const {status} = this;
			const index = status.mode.index;
			if (status.mode.type === "assemble") {
				for (const component of cad.data.components.data) {
					const {names, lines} = this.status;
					const found = component.entities.find((e) => e.id === entity.id);
					if (found) {
						const prev = names.findIndex((n) => n === component.name);
						const {space, position} = this.options;
						if (entity.selected) {
							if (position === "absolute") {
								if (prev > -1) {
									lines[prev] = found.id;
								} else {
									names.push(component.name);
									lines.push(found.id);
								}
							}
							if (position === "relative") {
								if (prev > -1) {
									if (prev === 0) {
										lines.push(found.id);
										if (lines.length > 2) {
											lines.shift();
										}
									} else {
										lines[prev] = found.id;
									}
								} else {
									names.push(component.name);
									lines.push(found.id);
								}
								lines.forEach((l) => (cad.findEntity(l).selected = true));
								cad.render();
							}
							if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
								found.selected = false;
								try {
									cad.assembleComponents({names, lines, space, position});
								} catch (error) {
									this.dialog.open(AlertComponent, {data: {contnet: error.message}});
								} finally {
									names.length = 0;
									lines.length = 0;
									cad.unselectAll().render();
								}
							}
						} else if (prev > -1) {
							if (position === "relative") {
								if (prev === 0) {
									const idx = lines.findIndex((l) => l === found.id);
									lines.splice(idx, -1);
									if (lines.length < 1) {
										names.splice(prev, 1);
									}
								} else {
									names.splice(prev, 1);
									lines.splice(prev + 1, 1);
								}
							} else {
								names.splice(prev, 1);
								lines.splice(prev, 1);
							}
						}
						break;
					}
				}
			}
			if (status.mode.type.includes("dimension")) {
				const dimension = cad.data.dimensions[index];
				if (status.mode.type === "dimension1") {
					dimension.entity1.id = entity.id;
					dimension.cad1 = cad.data.name;
				}
				if (status.mode.type === "dimension2") {
					dimension.entity2.id = entity.id;
					dimension.cad2 = cad.data.name;
				}
			}
		});
		this.cd.detectChanges();
		this.cadContainer.nativeElement.append(cad.view);
		this.refresh();
	}

	refresh(data?: CadData) {
		const setData = (d: CadData) => {
			if (d.options.length < 1) {
				this.addItem(0, "options", d);
			}
			if (d.conditions.length < 1) {
				this.addItem(0, "conditions", d);
			}
			if (d.baseLines.length < 1) {
				this.addItem(0, "baseLines", d);
			}
			if (d.jointPoints.length < 1) {
				this.addItem(0, "jointPoints", d);
			}
			if (d.dimensions.length < 1) {
				this.addItem(0, "dimensions", d);
			}
		};
		const cad = this.cad;
		setData(cad.data);
		if (data) {
			cad.reset(data);
		}
		document.title = "装配CAD - " + cad.data.name;
		cad.render(true);
		this.components.length = 0;
		this.status = {names: [], lines: [], activeComponent: null, mode: {type: "normal", index: -1}};
		this.components = [];
		this.options = {space: "", position: "absolute"};
		cad.exportData().components.data.forEach((v, i) => {
			const smallerCad = new CadViewer({entities: v.entities, layers: []}).render(true);
			const img = smallerCad.exportImage();
			this.components.push({name: v.name, img: img.src});
		});
	}

	flip(vertical: boolean, horizontal: boolean) {
		const name = this.status.activeComponent;
		if (name) {
			this.cad.flipComponent(name, vertical, horizontal);
		} else {
			this.cad.flip(vertical, horizontal);
		}
		this.cad.render(true);
	}

	rotate(clockwise?: boolean) {
		const name = this.status.activeComponent;
		let angle: number;
		if (clockwise === true) {
			angle = -Math.PI / 2;
		} else if (clockwise === false) {
			angle = Math.PI / 2;
		} else {
			angle = new Angle(this.rotateAngle, "deg").rad;
		}
		if (name) {
			this.cad.rotateComponent(name, angle);
		} else {
			this.cad.rotate(angle);
		}
		this.cad.render(true);
	}

	cloneComponent() {
		this.cad.cloneComponent(this.status.activeComponent).render(true);
		this.refresh();
	}

	async submit() {
		const data = this.cad.exportData("object");
		const params = this.route.snapshot.queryParams;
		const resData = await this.dataService.postCadData([data], params.encode, params.data);
		this.refresh(resData[0]);
	}

	toggleAssemble(event: Event) {
		const {cad, status} = this;
		const btn = event.target as HTMLButtonElement;
		if (btn.textContent === "开始装配") {
			cad.data.components.data.forEach((c) => {
				c.entities.forEach((e) => (e.selectable = true));
			});
			btn.textContent = "结束装配";
			status.mode.type = "assemble";
			cad.config.selectMode = "single";
			this.blur();
		} else {
			cad.data.components.data.forEach((c) => {
				c.entities.forEach((e) => {
					e.selectable = false;
					e.selected = false;
				});
			});
			cad.render();
			btn.textContent = "开始装配";
			status.mode.type = "normal";
			cad.config.selectMode = "none";
			this.focus(this.status.activeComponent);
		}
	}

	addItem(i: number, field: string, data?: any) {
		const initVal = cloneDeep(this.initVals[field]);
		(data || this.cad.data)[field].splice(i + 1, 0, initVal);
	}

	removeItem(i: number, field: string) {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		ref.afterClosed().subscribe((res) => {
			if (res === true) {
				const initVal = JSON.parse(JSON.stringify(this.initVals[field]));
				if (this.cad.data[field].length === 1) {
					this.cad.data[field][0] = initVal;
				} else {
					this.cad.data[field].splice(i, 1);
				}
			}
		});
	}

	private focus(name: string) {
		const cad = this.cad;
		cad.currentComponent = name;
		if (this.status.mode.type === "assemble") {
			return;
		}
		cad.data.components.data.forEach((component) => {
			component.entities.forEach((e) => {
				if (e.container) {
					if (component.name === name) {
						e.container.alpha = 2;
						cad.containers.inner.alpha = 0.5;
					} else {
						e.container.alpha = 1;
					}
				}
			});
		});
	}

	private blur() {
		const cad = this.cad;
		cad.currentComponent = null;
		cad.containers.inner.alpha = 1;
		cad.data.components.data.forEach((component) => {
			component.entities.forEach((e) => {
				if (e.container) {
					e.container.alpha = 1;
				}
			});
		});
	}

	selectComponent(i: number) {
		let name = "";
		if (this.status.activeComponent === this.components[i].name) {
			this.status.activeComponent = name;
			this.cad.currentComponent = name;
			this.blur();
		} else {
			name = this.components[i].name;
			this.status.activeComponent = name;
			this.cad.currentComponent = name;
			this.focus(name);
		}
	}

	removeConnection(i: number) {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		ref.afterClosed().subscribe((res) => {
			if (res === true) {
				this.cad.data.components.connections.splice(i, 1);
			}
		});
	}

	selectLineBegin(type: Mode["type"], index: number) {
		const {cad, status} = this;
		let entities = cad.data.entities;
		cad.data.components.data.forEach((d) => (entities = entities.concat(d.entities)));
		const ids = entities.map((e) => e.id);
		entities.forEach((e) => {
			if (e.container) {
				if (e.type === CadTypes.Line) {
					const le = e as CadLine;
					const slope = new Line(new Point(le.start), new Point(le.end)).slope;
					if ((type.includes("dimension") || ids.includes(e.id)) && (slope === 0 || !isFinite(slope))) {
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
		status.mode.type = type;
		status.mode.index = index;
		cad.config.selectedColor = 0x0000ff;
		cad.config.hoverColor = 0x00ffff;
		cad.config.selectMode = "single";
		cad.render();
	}

	selectLineEnd() {
		const {cad, status} = this;
		let entities = cad.data.entities;
		cad.data.components.data.forEach((d) => (entities = entities.concat(d.entities)));
		entities.forEach((e) => {
			if (e.container) {
				e.container.alpha = 1;
				e.selected = false;
				e.selectable = true;
			}
		});
		cad.config.selectedColor = null;
		cad.config.hoverColor = null;
		cad.config.selectMode = "none";
		cad.render();
		status.mode.type = "normal";
	}

	selectDimLine(i: number, line: number) {
		const {status, cad} = this;
		if (status.mode.type === "dimension" + line && status.mode.index === i) {
			this.selectLineEnd();
		} else {
			const {entity1, entity2} = cad.data.dimensions[i];
			if (line === 1) {
				cad.data.entities.forEach((e) => (e.selected = e.id === entity1.id));
				this.selectLineBegin("dimension1", i);
			}
			if (line === 2) {
				cad.data.entities.forEach((e) => (e.selected = e.id === entity2.id));
				this.selectLineBegin("dimension2", i);
			}
		}
	}

	editDimension(i: number) {
		const {cad, status} = this;
		status.dimension = this.cad.data.dimensions[i];
		status.mode.type = "normal";
		const ref: MatDialogRef<DimFormComponent, Dimension> = this.dialog.open(DimFormComponent, {
			data: {cad, index: i},
			disableClose: true,
		});
		ref.afterClosed().subscribe((dimension) => {
			if (dimension) {
				cad.data.dimensions[i] = dimension;
				cad.render();
			}
		});
	}

	getDimensionName(dimension: Dimension, index: number) {
		if (this.dimNameFocus === index) {
			return dimension.mingzi || "";
		} else {
			return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
		}
	}
}
