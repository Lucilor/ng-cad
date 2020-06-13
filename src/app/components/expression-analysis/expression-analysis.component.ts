import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from "@angular/material/dialog";
import {CadDataService, Order} from "@src/app/services/cad-data.service";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {ExpressionsParser} from "@src/app/cad-viewer/cad-data/utils";
import {OrderListComponent} from "../order-list/order-list.component";

@Component({
	selector: "app-expression-analysis",
	templateUrl: "./expression-analysis.component.html",
	styleUrls: ["./expression-analysis.component.scss"]
})
export class ExpressionAnalysisComponent implements OnInit {
	vars1: string[] = [];
	vars2: string[] = [];
	sort = (a: string, b: string) => {
		if (a > b) {
			return 1;
		} else if (a < b) {
			return -1;
		}
		return 0;
	};
	get valid() {
		return this.vars1.length >= this.vars2.length;
	}

	constructor(
		public dialogRef: MatDialogRef<ExpressionAnalysisComponent, boolean>,
		@Inject(MAT_DIALOG_DATA)
		public data: {cad: CadData},
		private dataService: CadDataService,
		private dialog: MatDialog
	) {}

	ngOnInit() {
		this.vars1 = this.data.cad.extractExpressions().getVariables(true).sort(this.sort);
	}

	async getOrder() {
		const ref = this.dialog.open(OrderListComponent, {data: {cad: this.data.cad}});
		const order = await ref.afterClosed().toPromise();
		if (order) {
			this.getExpressions(order);
		}
	}

	async getExpressions(order: Order) {
		const exps = await this.dataService.getOrderExpressions(order);
		this.vars2 = new ExpressionsParser(exps).getVariables(true).sort();
	}
}
