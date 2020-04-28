import {Component, ViewChild, ElementRef, AfterViewInit, OnInit} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData, CadLine, CadDimension} from "@app/cad-viewer/cad-data";
import {CadDataService} from "@services/cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {environment} from "@src/environments/environment";
import {Angle} from "@lucilor/utils";
import {CadMenu} from "../cad-menu/cad-menu.common";
import {MatDialog} from "@angular/material/dialog";
import {CadInfoComponent} from "../cad-menu/cad-info/cad-info.component";
import {CadLineComponent} from "../cad-menu/cad-line/cad-line.component";

const title = "编辑CAD";
@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"]
})
export class EditCadComponent implements OnInit, AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild("cadInfo", {read: CadInfoComponent}) cadInfo: CadInfoComponent;
	@ViewChild("cadLine", {read: CadLineComponent}) cadLine: CadLineComponent;
	cad: CadViewer;
	rotateAngle = 0;
	drawDimensions = true;
	drawMTexts = true;
	menu: CadMenu;
	constructor(private route: ActivatedRoute, private dataService: CadDataService, private dialog: MatDialog) {
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;
		document.title = title;
		this.cad = new CadViewer(new CadData(), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [20, 20, 20, 100],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "single"});
		this.menu = new CadMenu(dialog, this.cad, true, dataService);
	}

	async ngOnInit() {
		const data = await this.dataService.getCadData();
		data.forEach((d) => {
			this.cad.data.addComponent(d);
		});
		this.cad.render(true);
		this.menu.initData();
		this.cadInfo.updateCadLength();
		document.title = `${title}-${data.map((d) => d.name).join(",")}`;
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
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

	submitAll() {}
}
