import {MatPaginatorIntl} from "@angular/material/paginator";
import {Injectable} from "@angular/core";

@Injectable()
export class MyMatPaginatorIntl extends MatPaginatorIntl {
	itemsPerPageLabel = "每页条数";
	previousPageLabel = "上一页";
	nextPageLabel = "下一页";
	firstPageLabel = "首页";
	lastPageLabel = "尾页";

	getRangeLabel = (page: number, pageSize: number, length: number) => {
		const totalPage = Math.ceil(length / pageSize);
		return `第${page + 1}页，共${totalPage}页`;
		// tslint:disable-next-line: semicolon
	};
}
