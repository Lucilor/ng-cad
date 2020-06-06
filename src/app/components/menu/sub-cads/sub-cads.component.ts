import {Component, OnInit, Input} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CurrCadsAction} from "@src/app/store/actions";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {intersection} from "lodash";
import {MenuComponent} from "../menu.component";

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
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field: LeftMenuField;

	constructor(private store: Store<State>) {
		super();
	}

	ngOnInit() {
		window.addEventListener("keydown", () => {
			if (this.cad.selectedEntities.length === 0) {
				this.unselectAll();
			}
		});
	}

	private async _getCadNode(data: CadData, parent?: string) {
		const cad = new CadViewer(data, {width: 200, height: 100, padding: 10});
		const node: CadNode = {data, img: cad.exportImage().src, checked: false, indeterminate: false, parent};
		cad.destroy();
		await timeout(0);
		return node;
	}

	async update(data: CadData[]) {
		this.cads = [];
		this.partners = [];
		this.components = [];
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

	unselectAll(sync = true) {
		[...this.cads, ...this.partners, ...this.components].forEach((v) => {
			v.checked = false;
			v.indeterminate = false;
		});
		if (sync) {
			this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
		}
	}

	clickCad(field: LeftMenuField, index: number, event?: MatCheckboxChange) {
		const cad = this[field][index];
		const checked = event ? event.checked : !cad.checked;
		cad.checked = checked;
		if (checked) {
			cad.indeterminate = false;
			if (!this.multiSelect) {
				this.unselectAll(false);
			}
		}

		const ids1 = this.cads.filter((v) => v.checked).map((v) => v.data.id);
		const ids1Half = this.cads.filter((v) => v.indeterminate).map((v) => v.data.id);
		const cads2 = [...this.partners, ...this.components];
		let ids2 = cads2.filter((v) => v.checked).map((v) => v.data.id);
		if (field === "cads") {
			cads2.forEach((v) => {
				if (!ids1Half.includes(v.parent) || cad.data.id === v.parent) {
					v.checked = ids1.includes(v.parent);
				}
			});
			ids2 = cads2.filter((v) => v.checked).map((v) => v.data.id);
			this.store.dispatch<CurrCadsAction>({type: "set curr cads", ids: ids1});
		} else {
			this.store.dispatch<CurrCadsAction>({type: "set curr cads", ids: ids2});
		}
		this.cads.forEach((v) => {
			if (!v.checked) {
				const children = [...v.data.partners, ...v.data.components.data];
				const result = intersection(
					children.map((v) => v.id),
					ids2
				);
				v.indeterminate = result.length > 0;
			}
		});
	}

	saveStatus() {}

	loadStatus() {}
}
