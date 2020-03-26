import {Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef} from "@angular/core";
import {CadViewer, CadData, Events, CadEntity, ComponentPosition} from "@lucilor/cad-viewer";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "../cad-data.service";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {Angle} from "@lucilor/utils";

@Component({
	selector: "app-assemble-cad",
	templateUrl: "./assemble-cad.component.html",
	styleUrls: ["./assemble-cad.component.scss"]
})
export class AssembleCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	rotateAngle: number;
	components: {name: string; img: string}[];
	options: {space: string; position: ComponentPosition};
	status: {names: string[]; lines: string[]; activeComponent: string; assembling: boolean};
	constructor(
		private route: ActivatedRoute,
		private dataService: CadDataService,
		private dialog: MatDialog,
		private cd: ChangeDetectorRef
	) {
		this.status = {names: [], lines: [], activeComponent: null, assembling: false};
		this.components = [];
		this.options = {space: "", position: "absolute"};
	}

	async ngAfterViewInit() {
		document.title = "装配CAD";
		let data: CadData;
		const params = this.route.snapshot.queryParams;
		if (params.data) {
			data = await this.dataService.getCadData(params.encode, params.data);
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
			selectMode: "single",
			selectedColor: 0x0000ff
		}).render(true);
		cad.enableDragging()
			.enableWheeling()
			.enableKeyboard();
		this.cad = cad;
		cad.on(Events.entityclick, (event: PIXI.interaction.InteractionEvent, entity: CadEntity) => {
			for (const component of cad.data.components.data) {
				const {names, lines} = this.status;
				const found = component.entities.find(e => e.id === entity.id);
				if (found) {
					const prev = names.findIndex(n => n === component.name);
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
							lines.forEach(l => (cad.findEntity(l).selected = true));
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
								const idx = lines.findIndex(l => l === found.id);
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
		});
		this.cd.detectChanges();
		this.cadContainer.nativeElement.append(cad.view);
		this.refresh();
		window["view"] = this;
	}

	refresh(data?: CadData) {
		const cad = this.cad;
		if (data) {
			cad.reset(data);
		}
		document.title = "装配CAD - " + cad.data.name;
		cad.render(true)
			.drawDimensions()
			.render(true);
		this.components.length = 0;
		cad.exportData().components.data.forEach((v, i) => {
			const smallerCad = new CadViewer({entities: v.entities, layers: []}).render(true);
			const img = smallerCad.exportImage();
			this.components.push({name: v.name, img: img.src});
		});
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
			this.cad.rotate(new Angle(this.rotateAngle, "deg").rad);
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
		const resData = await this.dataService.postCadData(data, params.encode, params.data);
		this.refresh(resData);
	}

	toggleAssemble(event: Event) {
		const {cad} = this;
		const btn = event.target as HTMLButtonElement;
		if (btn.textContent === "开始装配") {
			cad.data.components.data.forEach(c => {
				c.entities.forEach(e => (e.selectable = true));
			});
			btn.textContent = "结束装配";
			this.status.assembling = true;
			this.blur();
		} else {
			cad.data.components.data.forEach(c => {
				c.entities.forEach(e => {
					e.selectable = false;
					e.selected = false;
				});
			});
			cad.render();
			btn.textContent = "开始装配";
			this.status.assembling = false;
			this.focus(this.status.activeComponent);
		}
	}

	private focus(name: string) {
		const cad = this.cad;
		cad.currentComponent = name;
		if (this.status.assembling) {
			return;
		}
		cad.data.components.data.forEach(component => {
			component.entities.forEach(e => {
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
		cad.data.components.data.forEach(component => {
			component.entities.forEach(e => {
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

	deleteConnection(i: number) {
		this.cad.data.components.connections.splice(i, 1);
	}
}
