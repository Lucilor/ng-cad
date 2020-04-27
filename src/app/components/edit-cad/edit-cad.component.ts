import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData, CadLine, CadDimension} from "@app/cad-viewer/cad-data";
import {CadDataService} from "@services/cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {environment} from "@src/environments/environment";
import {Angle} from "@lucilor/utils";
import {CadMenu} from "../cad-menu/cad-menu.common";
import {MatDialog} from "@angular/material/dialog";

const title = "编辑CAD";
@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"]
})
export class EditCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	cadsData: CadData[];
	rotateAngle = 0;
	drawDimensions = true;
	drawMTexts = true;
	menu: CadMenu;
	get cadData() {
		return this.cadsData[this.menu.cadIdx];
	}
	constructor(private route: ActivatedRoute, private dataService: CadDataService, private dialog: MatDialog) {
		this.menu = new CadMenu(dialog, this.cad, this.cadsData);
	}

	async ngAfterViewInit() {
		document.title = title;
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;
		this.cadsData = await this.dataService.getCadData();
		const vData = new CadData();
		this.cadsData.forEach((d) => {
			vData.merge(d);
		});
		this.cad = new CadViewer(vData, {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [20, 20, 20, 100],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "single"});
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
		this.cadData.transform({flip: {vertical, horizontal}});
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
