import {Component, OnInit, Input, Output, EventEmitter} from "@angular/core";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {ListCadComponent} from "../../list-cad/list-cad.component";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {RSAEncrypt} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {AngleInputComponent} from "../../index/angle-input/angle-input.component";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadDataService} from "@src/app/services/cad-data.service";

@Component({
	selector: "app-top-menu",
	templateUrl: "./top-menu.component.html",
	styleUrls: ["./top-menu.component.scss"]
})
export class TopMenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Output() openCad = new EventEmitter<CadData[]>();
	canSave = false;
	collection = "";
	constructor(private dialog: MatDialog, private dataService: CadDataService) {}

	ngOnInit() {
		this.canSave = this.cad.data.components.data.length > 0;
	}

	open(collection: string) {
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const ref: MatDialogRef<ListCadComponent, CadData[]> = this.dialog.open(ListCadComponent, {
			data: {type: collection, selectMode},
			width: "80vw"
		});
		ref.afterClosed().subscribe((data) => {
			if (data && data.length) {
				this.cad.data.components.data = data;
				this.cad.reset();
				document.title = data.map((v) => v.name).join(", ");
				this.canSave = collection !== "p_yuanshicadwenjian";
				this.collection = collection;
				this.openCad.emit(data);
			}
		});
	}

	async save() {
		if (this.canSave) {
			const {cad, dataService, collection} = this;
			const response = await dataService.postCadData(cad.data.components.data, RSAEncrypt({collection}));
			console.log(response);
		}
	}

	flip(vertical: boolean, horizontal: boolean) {
		this.transform(new CadTransformation({flip: {vertical, horizontal}}));
	}

	async rotate(clockwise?: boolean) {
		let angle = 0;
		if (clockwise === undefined) {
			const ref = this.dialog.open(AngleInputComponent);
			angle = await ref.afterClosed().toPromise();
		} else {
			if (clockwise === true) {
				angle = Math.PI / 2;
			} else if (clockwise === false) {
				angle = -Math.PI / 2;
			}
		}
		this.transform(new CadTransformation({rotate: {angle}}), typeof clockwise === "boolean");
	}

	transform(trans: CadTransformation, rotateDimension = false) {
		const {cad} = this;
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
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}
}