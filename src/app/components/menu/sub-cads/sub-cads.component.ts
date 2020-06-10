import {Component, OnInit, Input, ViewChild} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CurrCadsAction} from "@src/app/store/actions";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MenuComponent} from "../menu.component";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {ListCadComponent} from "../../list-cad/list-cad.component";
import {CadDataService} from "@src/app/services/cad-data.service";
import {RSAEncrypt} from "@lucilor/utils";

interface CadNode {
	data: CadData;
	img: string;
	checked: boolean;
	indeterminate: boolean;
	parent?: string;
}

type LeftMenuField = "cads" | "partners" | "components";

@Component({
	selector: "app-sub-cads",
	templateUrl: "./sub-cads.component.html",
	styleUrls: ["./sub-cads.component.scss"]
})
export class SubCadsComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	@Input() cadStatus: State["cadStatus"];
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field: LeftMenuField;
	@ViewChild(MatMenuTrigger) contextMenu: MatMenuTrigger;
	contextMenuCad: CadData;

	constructor(private store: Store<State>, private dialog: MatDialog, private dataService: CadDataService) {
		super();
	}

	ngOnInit() {}

	private async _getCadNode(data: CadData, parent?: string) {
		const cad = new CadViewer(data, {width: 200, height: 100, padding: 10});
		const node: CadNode = {data, img: cad.exportImage().src, checked: false, indeterminate: false, parent};
		cad.destroy();
		await timeout(0);
		return node;
	}

	async update() {
		this.cads = [];
		this.partners = [];
		this.components = [];
		const data = this.cad.data.components.data;
		for (const d of data) {
			const node = await this._getCadNode(d);
			this.cads.push(node);
			for (const dd of d.partners) {
				const node = await this._getCadNode(dd, d.id);
				this.partners.push(node);
			}
			for (const dd of d.components.data) {
				const node = await this._getCadNode(dd, d.id);
				this.components.push(node);
			}
		}
	}

	toggleMultiSelect() {
		this.multiSelect = !this.multiSelect;
		if (!this.multiSelect) {
			this.unselectAll();
		}
	}

	selectAll(field: LeftMenuField = null, sync = true) {
		let arr: CadNode[];
		if (field) {
			arr = this[field];
		} else {
			arr = [...this.cads, ...this.partners, ...this.components];
		}
		arr.forEach((v) => (v.checked = true));
		if (field === "cads") {
			[...this.partners, ...this.components].forEach((v) => {
				v.checked = true;
			});
		}
		if (sync) {
			this.setCurrCads();
		}
	}

	unselectAll(field: LeftMenuField = null, sync = true) {
		let arr: CadNode[];
		if (field) {
			arr = this[field];
		} else {
			arr = [...this.cads, ...this.partners, ...this.components];
		}
		arr.forEach((v) => (v.checked = false));
		if (field === "cads") {
			[...this.partners, ...this.components].forEach((v) => {
				v.checked = false;
			});
		} else {
			this.cads.forEach((v) => (v.checked = false));
		}
		if (sync) {
			this.setCurrCads();
		}
	}

	clickCad(field: LeftMenuField, index: number, event?: MatCheckboxChange) {
		const cad = this[field][index];
		const checked = event ? event.checked : !cad.checked;
		if (checked) {
			cad.indeterminate = false;
			if (!this.multiSelect) {
				this.unselectAll(null, false);
			}
		}
		cad.checked = checked;
		if (field === "cads") {
			[...this.partners, ...this.components]
				.filter((v) => v.parent === cad.data.id)
				.forEach((v) => {
					v.checked = checked;
				});
		} else {
			const parent = this.cads.find((v) => v.data.id === cad.parent);
			if (parent.checked && !checked) {
				parent.checked = false;
			}
		}
		this.setCurrCads();
	}

	setCurrCads() {
		const cads: State["currCads"] = {};
		this.cads.forEach((v) => {
			cads[v.data.id] = {self: v.checked, full: false, partners: [], components: []};
		});
		this.partners.forEach((v) => {
			if (v.checked) {
				cads[v.parent].partners.push(v.data.id);
			}
		});
		this.components.forEach((v) => {
			if (v.checked) {
				cads[v.parent].components.push(v.data.id);
			}
		});
		this.cads.forEach((v) => {
			const cad = cads[v.data.id];
			const fullPartners = cad.partners.length === v.data.partners.length;
			const fullComponents = cad.components.length === v.data.components.data.length;
			cad.full = fullPartners && fullComponents;
			v.indeterminate = !cad.full && cad.self;
		});
		this.store.dispatch<CurrCadsAction>({type: "set curr cads", cads});
	}

	onContextMenu(event: PointerEvent, cad: CadData) {
		super.onContextMenu(event);
		this.contextMenuCad = cad;
		this.contextMenu.openMenu();
	}

	editChildren(type: "partners" | "components") {
		const data = this.contextMenuCad;
		let checkedItems: CadData[];
		if (type === "partners") {
			checkedItems = [...data.partners];
		}
		if (type === "components") {
			checkedItems = [...data.components.data];
		}
		const ref: MatDialogRef<ListCadComponent, CadData[]> = this.dialog.open(ListCadComponent, {
			data: {selectMode: "multiple", checkedItems, options: data.options}
		});
		ref.afterClosed().subscribe(async (cads) => {
			if (Array.isArray(cads)) {
				cads = cads.map((v) => v.clone(true));
				if (type === "partners") {
					data.partners = cads;
				}
				if (type === "components") {
					data.components.data = cads;
				}
				this.cad.data.updatePartners().updateComponents();
				this.update();
			}
		});
	}

	downloadDxf() {
		const data = this.contextMenuCad;
		this.dataService.downloadDxf(data.id);
	}

	deleteSelected() {
		const data = this.cad.data;
		const checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data.id);
		data.components.data = data.components.data.filter((v) => !checkedCads.includes(v.id));
		const toRemove: {[key: string]: {p: string[]; c: string[]}} = {};
		this.partners.forEach((v) => {
			if (!checkedCads.includes(v.parent) && v.checked) {
				if (!toRemove[v.parent]) {
					toRemove[v.parent] = {p: [], c: []};
				}
				toRemove[v.parent].p.push(v.data.id);
			}
		});
		this.components.forEach((v) => {
			if (!checkedCads.includes(v.parent) && v.checked) {
				if (!toRemove[v.parent]) {
					toRemove[v.parent] = {p: [], c: []};
				}
				toRemove[v.parent].c.push(v.data.id);
			}
		});
		for (const id in toRemove) {
			const {p, c} = toRemove[id];
			const parent = data.components.data.find((v) => v.id === id);
			parent.partners = parent.partners.filter((v) => !p.includes(v.id));
			parent.components.data = parent.components.data.filter((v) => !c.includes(v.id));
		}
		this.update();
		this.cad.reset(null, false);
		this.setCurrCads();
	}

	editSelected() {
		open("index?data=" + RSAEncrypt({ids: this.currCads.map((v) => v.id)}));
	}

	saveStatus() {}

	loadStatus() {}
}
