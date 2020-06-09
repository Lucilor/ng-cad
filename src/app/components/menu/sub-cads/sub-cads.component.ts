import {Component, OnInit, Input} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CurrCadsAction, CadStatusAction} from "@src/app/store/actions";
import {MatCheckboxChange} from "@angular/material/checkbox";
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
	@Input() cadStatus: State["cadStatus"];
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field: LeftMenuField;

	constructor(private store: Store<State>) {
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
		const cads: State["currCads"] = {};
		const cad = this[field][index];
		const checked = event ? event.checked : !cad.checked;
		if (checked) {
			cad.indeterminate = false;
			if (!this.multiSelect) {
				this.unselectAll(false);
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

	saveStatus() {}

	loadStatus() {}
}
