import {Component, OnInit, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "../cad-data.service";
import {CadData, CadViewer, Events, CadEntity} from "@lucilor/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";

@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"]
})
export class EditCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	panelOpenState = false;
	constructor(private route: ActivatedRoute, private dataService: CadDataService, private dialog: MatDialog) {}

	async ngAfterViewInit() {
		document.title = "编辑CAD";
		console.log(this.cadContainer);
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
		this.cadContainer.nativeElement.append(cad.view);
		document.title += " - " + cad.data.name;
		cad.on(Events.entityclick, (event: PIXI.interaction.InteractionEvent, entity: CadEntity) => {
			// this._onLineClick(entity);
		});
		cad.on(Events.drag, () => {
			// this.lineController.setLinePoints();
			// this.lineController.updateJointPoints();
		});
		cad.on(Events.wheel, () => {
			// this.lineController.setLinePoints();
			// this.lineController.updateJointPoints();
		});
		cad.render(true)
			.drawDimensions()
			.render(true);
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
}
