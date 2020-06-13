import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDataService, Order} from "@src/app/services/cad-data.service";
import {timeout} from "@src/app/app.common";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
	selector: "app-order-list",
	templateUrl: "./order-list.component.html",
	styleUrls: ["./order-list.component.scss"]
})
export class OrderListComponent implements OnInit {
	tableData: Order[] = [];
	displayedColumns = ["select", "vid", "code", "s_designPic"];
	checkedColumn: Order;

	constructor(
		public dialogRef: MatDialogRef<OrderListComponent, Order>,
		@Inject(MAT_DIALOG_DATA)
		public data: {cad: CadData},
		private dataService: CadDataService,
		private snackBar: MatSnackBar
	) {}

	async ngOnInit() {
		await timeout(0);
		this.tableData = await this.dataService.getOrders(this.data.cad);
	}

	submit() {
		if (this.checkedColumn) {
			this.dialogRef.close(this.checkedColumn);
		} else {
			this.snackBar.open("尚未选择公式");
		}
	}

	cancle() {
		this.dialogRef.close();
	}
}
