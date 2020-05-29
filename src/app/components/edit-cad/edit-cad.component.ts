import {Component, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadDataService} from "@services/cad-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {environment} from "@src/environments/environment";
import {Angle} from "@lucilor/utils";
import {CadMenu} from "../cad-menu/cad-menu.common";
import {MatDialog} from "@angular/material/dialog";
import {CadInfoComponent} from "../cad-menu/cad-info/cad-info.component";
import {CadLineComponent} from "../cad-menu/cad-line/cad-line.component";
import {CadDimensionComponent} from "../cad-menu/cad-dimension/cad-dimension.component";
import {CadSubcadComponent} from "../cad-menu/cad-subcad/cad-subcad.component";
import {trigger, transition, style, animate} from "@angular/animations";
import {CadAssembleComponent} from "../cad-menu/cad-assemble/cad-assemble.component";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";

const title = "编辑CAD";
@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"],
	animations: [
		trigger("topMenuTrigger", [
			transition(":enter", [style({transform: "translate(-50%,-100%)"}), animate("100ms", style({transform: "translate(-50%,0)"}))]),
			transition(":leave", [animate("100ms", style({transform: "translate(-50%,-100%)"}))])
		])
	]
})
export class EditCadComponent implements OnInit, AfterViewInit, OnDestroy {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild("cadInfo", {read: CadInfoComponent}) cadInfo: CadInfoComponent;
	@ViewChild("cadLine", {read: CadLineComponent}) cadLine: CadLineComponent;
	@ViewChild("cadDimension", {read: CadDimensionComponent}) cadDimension: CadDimensionComponent;
	@ViewChild("subcad", {read: CadSubcadComponent}) subcad: CadSubcadComponent;
	@ViewChild("cadAssemble", {read: CadAssembleComponent}) cadAssemble: CadAssembleComponent;
	tooltipText = [
		"移动：shift+左键 或 中键 或 wasd 或 方向键",
		"缩放：滚轮 或 [键 + ]键",
		"全选：ctrl+a",
		"全不选：esc",
		"锁定下一次鼠标触碰的线：按住Ctrl",
		"删除选中的实体: Delete"
	].join("\n");
	menuMap: {[key: string]: CadMenu["viewMode"][]} = {
		subcad: ["normal", "components", "partners"],
		cadInfo: ["normal", "partners"],
		cadLine: ["normal", "partners"],
		cadAssemble: ["components"],
		cadDimension: ["normal", "partners"],
		cadMtext: ["normal", "partners"]
	};
	cad: CadViewer;
	rotateAngle = 0;
	menu: CadMenu;
	showTopMenu = false;

	constructor(private route: ActivatedRoute, private dataService: CadDataService, dialog: MatDialog, private router: Router) {
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;
		document.title = title;
		this.cad = new CadViewer(new CadData(), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [30, 370, 30, 125],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "multiple"});
		this.menu = new CadMenu(dialog, this.cad, dataService);
	}

	async ngOnInit() {
		const {partners, components} = this.route.snapshot.queryParams;
		Promise.all([this.dataService.getCadData(), this.dataService.getShowLineInfo()]).then((value) => {
			const data = value[0];
			if (value[1] === true) {
				this.menuMap.cadInfo.push("components");
				this.menuMap.cadLine.push("components");
			}
			data.forEach((d) => this.cad.data.addComponent(d));
			this.cad.render(true);
			this.menu.initData();
			if (partners) {
				this.menu.focus(0, [0], "partners");
			} else if (components) {
				this.menu.focus(0, [0], "components");
			} else {
				this.menu.focus(0, [], "normal");
			}
			this.subcad.updateList();
			document.title = `${title}-${data.map((d) => d.name).join(",")}`;

			window.addEventListener("pointermove", (event) => {
				const {clientY: y} = event;
				if (y <= 90) {
					this.showTopMenu = true;
				} else {
					this.showTopMenu = false;
				}
			});
			window.addEventListener("resize", () => {
				this.cad.resize(innerWidth, innerHeight);
			});
		});
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
	}

	ngOnDestroy() {
		this.cad.destroy();
	}

	flip(vertical: boolean, horizontal: boolean) {
		this.transform(new CadTransformation({flip: {vertical, horizontal}}));
	}

	rotate(clockwise?: boolean) {
		let angle = 0;
		if (clockwise === true) {
			angle = Math.PI / 2;
		} else if (clockwise === false) {
			angle = -Math.PI / 2;
		} else {
			angle = new Angle(this.rotateAngle, "deg").rad;
		}
		this.transform(new CadTransformation({rotate: {angle}}), typeof clockwise === "boolean");
	}

	transform(trans: CadTransformation, rotateDimension = false) {
		const {cad, menu} = this;
		const fn = (data: CadData) => {
			const {x, y} = data.getAllEntities().getBounds();
			trans.anchor.set(x, y);
			data.transform(trans);
			if (rotateDimension) {
				data.getAllEntities().dimension.forEach((d) => {
					if (d.axis === "x") {
						d.axis = "y";
					} else {
						d.axis = "x";
					}
				});
			}
		};
		const seleted = cad.selectedEntities;
		if (seleted.length) {
			const {x, y} = seleted.getBounds();
			trans.anchor.set(x, y);
			seleted.transform(trans);
		} else if (menu.cadIdxs2.length) {
			menu.cadIdxs2.forEach((i) => {
				fn(menu.getData(menu.cadIdx, i));
			});
		} else {
			fn(menu.getData());
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	setViewMode(mode: CadMenu["viewMode"]) {
		if (mode === "slice") {
			const queryParams = this.route.snapshot.queryParams;
			this.router.navigate(["draw-cad"], {queryParams: {...queryParams, fromEdit: true}});
		} else {
			if (this.menu.viewMode === "components" && this.cadAssemble.assembling) {
				this.cadAssemble.toggleAssemble();
			}
			this.menu.focus(this.menu.cadIdx, [0], mode);
			this.subcad.updateList();
		}
	}

	isMenuHidden(name: string) {
		return !this.menuMap[name].includes(this.menu.viewMode);
	}

	submitAll() {
		this.menu.submit(true);
	}
}
