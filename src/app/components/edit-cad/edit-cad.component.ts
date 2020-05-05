import {Component, ViewChild, ElementRef, AfterViewInit, OnInit} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData, CadDimension} from "@app/cad-viewer/cad-data";
import {CadDataService} from "@services/cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {environment} from "@src/environments/environment";
import {Angle} from "@lucilor/utils";
import {CadMenu} from "../cad-menu/cad-menu.common";
import {MatDialog} from "@angular/material/dialog";
import {CadInfoComponent} from "../cad-menu/cad-info/cad-info.component";
import {CadLineComponent} from "../cad-menu/cad-line/cad-line.component";
import {CadDimensionComponent} from "../cad-menu/cad-dimension/cad-dimension.component";
import {CadSubcadComponent} from "../cad-menu/cad-subcad/cad-subcad.component";
import {trigger, transition, style, animate} from "@angular/animations";

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
export class EditCadComponent implements OnInit, AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild("cadInfo", {read: CadInfoComponent}) cadInfo: CadInfoComponent;
	@ViewChild("cadLine", {read: CadLineComponent}) cadLine: CadLineComponent;
	@ViewChild("cadDimension", {read: CadDimensionComponent}) cadDimension: CadDimensionComponent;
	@ViewChild("subcad", {read: CadSubcadComponent}) subcad: CadSubcadComponent;
	cad: CadViewer;
	rotateAngle = 0;
	drawDimensions = true;
	drawMTexts = true;
	menu: CadMenu;
	showTopMenu = false;

	constructor(private route: ActivatedRoute, private dataService: CadDataService, private dialog: MatDialog) {
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
		this.cad.setControls({selectMode: "single"});
		this.menu = new CadMenu(dialog, this.cad, true, dataService);
	}

	async ngOnInit() {
		const join = this.route.snapshot.queryParams.join;
		const data = await this.dataService.getCadData();
		data.forEach((d) => this.cad.data.addComponent(d));
		this.cad.render(true);
		this.menu.initData();
		if (join) {
			this.menu.focus(0, 0, "partners");
		} else {
			this.menu.focus(0, -1, "normal");
		}
		this.subcad.updateList();
		document.title = `${title}-${data.map((d) => d.name).join(",")}`;

		window.addEventListener("pointermove", (event) => {
			const {clientX: x, clientY: y} = event;
			if (y <= 90) {
				this.showTopMenu = true;
			} else {
				this.showTopMenu = false;
			}
		});
		window.addEventListener("resize", () => {
			this.cad.resize(innerWidth, innerHeight);
		});
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
	}

	toggleDimensions() {
		this.drawDimensions = !this.drawDimensions;
		this.cad.data.getAllEntities().dimension.forEach((e) => (e.visible = this.drawDimensions));
		this.cad.render();
	}

	toggleMtexts() {
		this.drawMTexts = !this.drawMTexts;
		this.cad.data.getAllEntities().mtext.forEach((e) => (e.visible = this.drawMTexts));
		this.cad.render();
	}

	flip(vertical: boolean, horizontal: boolean) {
		// const partner = this.status.partner;
		// if (partner) {
		// 	this.vCad.flipPartner(partner, vertical, horizontal).render(true);
		// 	this.cad.flipPartner(partner, vertical, horizontal);
		// } else {
		// 	this.vCad.flip(vertical, horizontal).render(true);
		// 	this.cad.flip(vertical, horizontal);
		// }
		this.cad.data.transform({flip: {vertical, horizontal}});
		this.cad.render(true);
	}

	rotate(clockwise?: boolean) {
		let angle = 0;
		if (clockwise === true) {
			angle = -Math.PI / 2;
		} else if (clockwise === false) {
			angle = Math.PI / 2;
		} else {
			angle = new Angle(this.rotateAngle, "deg").rad;
		}
		if (typeof clockwise === "boolean") {
			const reverseAxis = (d: CadDimension) => {
				if (d.axis === "x") {
					d.axis = "y";
				} else {
					d.axis = "x";
				}
			};
			this.cad.data.entities.dimension.forEach((d) => reverseAxis(d));
			this.cad.data.partners.forEach((p) => {
				p.entities.dimension.forEach((d) => reverseAxis(d));
			});
			this.cad.data.components.data.forEach((c) => {
				c.entities.dimension.forEach((d) => reverseAxis(d));
			});
			// this.cad.data.entities.dimension.forEach((d) => reverseAxis(d));
			// this.cad.data.partners.forEach((p) => {
			// 	p.entities.dimension.forEach((d) => reverseAxis(d));
			// });
			// this.cad.data.components.data.forEach((c) => {
			// 	c.entities.dimension.forEach((d) => reverseAxis(d));
			// });
		}
		// const partner = this.status.partner;
		// if (partner) {
		// 	this.vCad.rotatePartner(partner, angle).render(true);
		// 	this.cad.rotatePartner(partner, angle);
		// } else {
		// 	this.vCad.rotate(angle).render(true);
		// 	this.cad.rotate(angle);
		// }
		this.cad.data.transform({rotate: {angle}});
		this.cad.render(true);
	}

	setViewMode(mode: CadMenu["viewMode"]) {
		this.menu.focus(this.menu.cadIdx, 0, mode);
		this.subcad.updateList();
	}

	submitAll() {}
}
