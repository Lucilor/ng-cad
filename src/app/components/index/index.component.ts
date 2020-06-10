import {Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy} from "@angular/core";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {environment} from "@src/environments/environment";
import {session, timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {getCurrCads, getCadStatus} from "@src/app/store/selectors";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {Vector2} from "three";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CurrCadsAction, CadStatusAction} from "@src/app/store/actions";
import {take} from "rxjs/operators";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";

@Component({
	selector: "app-index",
	templateUrl: "./index.component.html",
	styleUrls: ["./index.component.scss"]
})
export class IndexComponent implements OnInit, AfterViewInit, OnDestroy {
	cad: CadViewer;
	collection = "";
	currCads: CadData[];
	cadStatus: State["cadStatus"];
	cadStatusStr: string;
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild(ToolbarComponent) toolbar: ToolbarComponent;
	@ViewChild(SubCadsComponent) subCads: SubCadsComponent;
	@ViewChild(CadInfoComponent) cadInfo: CadInfoComponent;

	constructor(private store: Store<State>) {}

	ngOnInit() {
		this.cad = new CadViewer(new CadData(), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [50, 300, 30, 250],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "multiple"});
		if (this.cad.stats) {
			this.cad.stats.dom.style.right = "0";
			this.cad.stats.dom.style.left = "";
		}
		this.store.select(getCurrCads).subscribe((cads) => {
			console.log(cads);
			const ids = [];
			for (const id in cads) {
				const cad = cads[id];
				if (cad.self && cad.full) {
					ids.push(id);
				} else {
					ids.push(...cad.partners, ...cad.components);
				}
			}
			this.currCads = this.cad.data.findChildren(ids);
			this.currCads.forEach((v) => this.setCadData(v));
			if (this.cadStatus) {
				this.store.dispatch<CadStatusAction>({type: "refresh cad status"});
			}
		});
		this.store.select(getCadStatus).subscribe((cadStatus) => {
			this.cadStatus = cadStatus;
			if (cadStatus.name === "normal") {
				this.cadStatusStr = "普通";
				this.cad.controls.config.selectMode = "multiple";
				const controls = this.cad.controls;
				if (this.currCads.length) {
					this.cad.traverse((o, e) => {
						o.userData.selectable = false;
						o.userData.selected = false;
						e.opacity = 0.3;
					});
					this.currCads.forEach((v) => {
						this.cad.traverse((o, e) => {
							o.userData.selectable = true;
							e.opacity = 1;
						}, v.getAllEntities());
					});
					controls.config.dragAxis = "";
				} else {
					this.cad.traverse((o, e) => {
						o.userData.selectable = true;
						o.userData.selected = false;
						e.opacity = 1;
					});
					this.cad.controls.config.dragAxis = "xy";
				}
			} else if (cadStatus.name === "select line") {
				this.cadStatusStr = "选择线";
				this.cad.traverse((o, e) => {
					if (e instanceof CadLine) {
						if (e.isHorizonal() || e.isVertical()) {
							e.opacity = 1;
							o.userData.selectable = true;
						} else {
							e.opacity = 0.3;
							o.userData.selectable = false;
						}
					} else {
						e.opacity = 0.3;
						o.userData.selectable = false;
					}
				});
				this.cad.controls.config.selectMode = "single";
			}
			this.cad.render();
		});

		let lastPointer: Vector2 = null;
		const controls = this.cad.controls;
		controls.on("dragstart", ({clientX, clientY, shiftKey, button}) => {
			if (controls.config.dragAxis === "" && (button === 1 || (shiftKey && button === 0))) {
				lastPointer = new Vector2(clientX, clientY);
			}
		});
		controls.on("drag", ({clientX, clientY}) => {
			if (lastPointer) {
				const {cad, currCads} = this;
				const pointer = new Vector2(clientX, clientY);
				const translate = lastPointer.sub(pointer).divideScalar(cad.scale);
				translate.x = -translate.x;
				currCads.forEach((v) => v.transform(new CadTransformation({translate})));
				cad.render();
				lastPointer.copy(pointer);
			}
		});
		controls.on("dragend", () => {
			lastPointer = null;
		});
		controls.on("entitiesdelete", () => this.refreshCurrCads());

		Object.assign(window, {app: this});
		window.addEventListener("resize", () => this.cad.resize(innerWidth, innerHeight));
		window.addEventListener("keydown", ({key}) => {
			if (key === "Escape") {
				if (this.cadStatus.name !== "normal") {
					this.store.dispatch<CadStatusAction>({type: "set cad status", cadStatus: {name: "normal", index: -1}});
				}
			}
		});
		window.addEventListener("contextmenu", (event) => {
			event.preventDefault();
		});
		window.addEventListener("beforeunload", () => this.cad.destroy());
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
		(async () => {
			await timeout(0);
			this.subCads.update();
		})();
	}

	ngOnDestroy() {
		this.cad.destroy();
	}

	afterOpenCad(data: CadData[]) {
		this.cad.data.components.data = data;
		this.cad.reset();
		document.title = data.map((v) => v.name).join(", ");
		this.subCads.update();
	}

	setCadData(data: CadData) {
		if (data.options.length < 1) {
			data.options.push(new CadOption());
		}
		if (data.conditions.length < 1) {
			data.conditions.push("");
		}
		if (data.baseLines.length < 1) {
			data.baseLines.push(new CadBaseLine());
		}
		if (data.jointPoints.length < 1) {
			data.jointPoints.push(new CadJointPoint());
		}
		// const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
		// const mtext = new CadMtext();
		// const {x, y, width, height} = data.getAllEntities().getBounds();
		// mtext.text = `${zhankaikuan} x ${zhankaigao} = ${shuliang}`;
		// if (Number(shuliangbeishu) > 1) {
		// 	mtext.text += " x " + shuliangbeishu;
		// }
		// mtext.insert = new Vector2(x - width / 2, y - height / 2 - 10);
		// mtext.visible = this.showCadGongshis;
		// data.entities.add(mtext);
		// this.cadGongshis.push(mtext);
		data.partners.forEach((v) => this.setCadData(v));
		data.components.data.forEach((v) => this.setCadData(v));
	}

	refreshCurrCads() {
		this.store.dispatch<CurrCadsAction>({type: "refresh curr cads"});
	}
}
