import {Component, OnInit, Input} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CurrCadsAction} from "@src/app/store/actions";
import {MatCheckboxChange} from "@angular/material/checkbox";

interface CadNode {
	data: CadData;
	img: string;
	checked: boolean;
}

type LeftMenuField = "cads" | "partners" | "components";

@Component({
	selector: "app-left-menu",
	templateUrl: "./left-menu.component.html",
	styleUrls: ["./left-menu.component.scss"]
})
export class LeftMenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field: LeftMenuField;

	constructor(private store: Store<State>) {}

	ngOnInit() {}

	private async _getCadNode(data: CadData) {
		const cad = new CadViewer(data, {width: 200, height: 100, padding: 10});
		const node = {data, img: cad.exportImage().src, checked: false};
		cad.destroy();
		await timeout(0);
		return node;
	}

	async update(data: CadData[]) {
		this.cads = [];
		for (const d of data) {
			const node = await this._getCadNode(d);
			this.cads.push(node);
			for (const dd of d.partners) {
				const node = await this._getCadNode(dd);
				this.partners.push(node);
			}
			for (const dd of d.components.data) {
				const node = await this._getCadNode(dd);
				this.components.push(node);
			}
		}
	}

	clickCad(field: LeftMenuField, index: number, event?: MatCheckboxChange) {
		const cad = this[field][index];
		const checked = event ? event.checked : !cad.checked;
		if (this.field !== field) {
			this.field = field;
			this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
			(["cads", "partners", "components"] as LeftMenuField[]).forEach((v) => {
				if (v !== field) {
					this[field].forEach((vv) => (vv.checked = false));
				}
			});
		}
		cad.checked = checked;
		if (checked && !this.multiSelect) {
			this[field].forEach((v) => (v.checked = false));
		}
		if (checked) {
			this.store.dispatch<CurrCadsAction>({type: "add curr cad", cad: cad.data.id});
		} else {
			this.store.dispatch<CurrCadsAction>({type: "remove curr cad", cad: cad.data.id});
		}
	}
}
