import {Component, OnInit, Input} from "@angular/core";
import {MenuComponent} from "../menu.component";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData, CadOption} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadOptionsComponent} from "../../cad-menu/cad-options/cad-options.component";
import {getCurrCads} from "@src/app/store/selectors";
import {timeout} from "@src/app/app.common";
import {CadDataService} from "@src/app/services/cad-data.service";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	lengths: string[] = [];
	sampleFormulas: string[] = [];

	constructor(private store: Store<State>, private dialog: MatDialog, private dataService: CadDataService) {
		super();
	}

	ngOnInit() {
		this.store.select(getCurrCads).subscribe(async () => {
			await timeout(0);
			this.updateLengths();
		});
		this.dataService.getSampleFormulas().then((result) => {
			this.sampleFormulas = result;
		});
	}

	updateLengths() {
		this.currCads.forEach((v, i) => {
			let length = 0;
			const entities = v.getAllEntities();
			entities.line.forEach((e) => (length += e.length));
			entities.arc.forEach((e) => (length += e.curve.getLength()));
			entities.circle.forEach((e) => (length += e.curve.getLength()));
			this.lengths[i] = length.toFixed(2);
		});
	}

	selectOptions(option: CadOption | string, index: number) {
		const data = this.currCads[index];
		if (option instanceof CadOption) {
			const checkedItems = option.value.split(",");
			const ref: MatDialogRef<CadOptionsComponent, string[]> = this.dialog.open(CadOptionsComponent, {
				data: {data, name: option.name, checkedItems}
			});
			ref.afterClosed().subscribe((v) => {
				if (Array.isArray(v)) {
					option.value = v.join(",");
				}
			});
		} else if (option === "huajian") {
			const checkedItems = data.huajian.split(",");
			const ref: MatDialogRef<CadOptionsComponent, string[]> = this.dialog.open(CadOptionsComponent, {
				data: {data, name: "花件", checkedItems}
			});
			ref.afterClosed().subscribe((v) => {
				if (Array.isArray(v)) {
					data.huajian = v.join(",");
				}
			});
		}
	}

	saveStatus() {}

	loadStatus() {}
}
