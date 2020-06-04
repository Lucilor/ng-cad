import {Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef} from "@angular/core";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {ListCadComponent} from "../../list-cad/list-cad.component";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {RSAEncrypt} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {AngleInputComponent} from "../../index/angle-input/angle-input.component";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadDataService} from "@src/app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {getCurrCads} from "@src/app/store/selectors";
import {CurrCadsAction} from "@src/app/store/actions";
import {AlertComponent} from "../../alert/alert.component";
import {MenuComponent} from "../menu.component";

@Component({
	selector: "app-top-menu",
	templateUrl: "./top-menu.component.html",
	styleUrls: ["./top-menu.component.scss"]
})
export class TopMenuComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Output() openCad = new EventEmitter<CadData[]>();
	canSave = false;
	collection = "";
	currCads: CadData[];
	keyMap: {[key: string]: () => void} = {
		s: () => this.save(),
		1: () => this.open("p_yuanshicadwenjian"),
		2: () => this.open("cad"),
		3: () => this.open("cadmuban"),
		4: () => this.open("qiliaozuhe"),
		5: () => this.open("qieliaocad")
	};

	constructor(private dialog: MatDialog, private dataService: CadDataService, private store: Store<State>) {
		super();
	}

	ngOnInit() {
		this.canSave = this.cad.data.components.data.length > 0;
		this.store.select(getCurrCads).subscribe((cads) => {
			this.currCads = this.cad.data.findChildren(Array.from(cads));
		});

		window.addEventListener("keydown", (event) => {
			const {key, ctrlKey} = event;
			if (ctrlKey) {
				event.preventDefault();
				this.clickBtn(key);
			}
		});
	}

	clickBtn(key: string) {
		this.keyMap[key]?.();
	}

	open(collection: string) {
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const ref: MatDialogRef<ListCadComponent, CadData[]> = this.dialog.open(ListCadComponent, {
			data: {type: collection, selectMode, checkedItems: this.cad.data.components.data},
			width: "80vw"
		});
		ref.afterClosed().subscribe((data) => {
			if (data) {
				this.cad.data.components.data = data;
				this.cad.reset();
				document.title = data.map((v) => v.name).join(", ");
				this.canSave = collection !== "p_yuanshicadwenjian";
				this.collection = collection;
				this.openCad.emit(data);
				this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
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
		const seleted = cad.selectedEntities;
		if (seleted.length) {
			const {x, y} = seleted.getBounds();
			trans.anchor.set(x, y);
			seleted.transform(trans);
		} else {
			this.currCads.forEach((data) => {
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
			});
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	showHelpInfo() {
		this.dialog.open(AlertComponent, {
			data: {title: "帮助信息", content: "按钮右上角的数字或字母表示该按钮的快捷键，按下Ctrl与快捷键即视为点击按钮"}
		});
	}

	saveStatus() {}

	loadStatus() {}
}
