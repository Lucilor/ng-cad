import {Component, OnInit, Input, Output, EventEmitter} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadDataService} from "@src/app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {ListCadComponent} from "../../list-cad/list-cad.component";
import {CurrCadsAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {AngleInputComponent} from "../../index/angle-input/angle-input.component";
import {AlertComponent} from "../../alert/alert.component";
import {MenuComponent} from "../menu.component";

@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	@Output() openCad = new EventEmitter<CadData[]>();
	canSave = true;
	collection: string;
	ids: string[];
	openLock = false;
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

	async ngOnInit() {
		window.addEventListener("keydown", (event) => {
			const {key, ctrlKey} = event;
			if (ctrlKey) {
				event.preventDefault();
				this.clickBtn(key);
			}
		});

		if (this.dataService.data) {
			const data = await this.dataService.getCadData(this.dataService.data);
			this.openCad.emit(data);
		} else {
			const ids = this.ids;
			if (ids.length) {
				this.canSave = this.collection !== "p_yuanshicadwenjian";
				const data = await this.dataService.getCadData({ids});
				this.openCad.emit(data);
			} else {
				this.canSave = this.cad.data.components.data.length > 0;
			}
		}
	}

	clickBtn(key: string) {
		this.keyMap[key]?.();
	}

	open(collection: string) {
		if (this.openLock) {
			return;
		}
		if (collection === "p_yuanshicadwenjian") {
			this.dialog.open(AlertComponent, {data: {content: "暂未支持"}});
			return;
		}
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const ref: MatDialogRef<ListCadComponent, CadData[]> = this.dialog.open(ListCadComponent, {
			data: {type: collection, selectMode, checkedItems: this.cad.data.components.data}
		});
		this.openLock = true;
		ref.afterClosed().subscribe((data) => {
			if (data) {
				this.collection = collection;
				this.openCad.emit(data);
				this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
			}
			this.openLock = false;
		});
	}

	async save() {
		if (this.canSave) {
			const {cad, dataService, collection} = this;
			const response = await dataService.postCadData(cad.data.components.data, RSAEncrypt({collection}));
			console.log(response);
		}
	}

	flip(event: PointerEvent, vertical: boolean, horizontal: boolean) {
		event.stopPropagation();
		this.transform(new CadTransformation({flip: {vertical, horizontal}}));
	}

	async rotate(event: PointerEvent, clockwise?: boolean) {
		event.stopPropagation();
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
			const t = (data: CadData) => {
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
			if (this.currCads.length) {
				this.currCads.forEach((data) => t(data));
			} else {
				this.cad.data.components.data.forEach((data) => t(data));
			}
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	showHelpInfo() {
		this.dialog.open(AlertComponent, {
			data: {title: "帮助信息", content: "按钮右上角的数字或字母表示该按钮的快捷键，按下Ctrl与快捷键即视为点击按钮"}
		});
	}

	saveStatus() {
		const data = {
			collection: this.collection,
			ids: this.cad.data.components.data.map((v) => v.id)
		};
		this.session.save("toolbar", data);
	}

	async loadStatus() {
		const data = this.session.load("toolbar", true);
		this.collection = data.collection || "";
		this.ids = data.ids || [];
	}
}
