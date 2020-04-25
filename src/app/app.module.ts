import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {DrawCadComponent} from "@components/draw-cad/draw-cad.component";
import {LoadingComponent} from "./components/loading/loading.component";
import {StoreModule} from "@ngrx/store";
import {reducers, metaReducers} from "./store/reducers";
import {HttpClientModule} from "@angular/common/http";
import {PageNotFoundComponent} from "./components/page-not-found/page-not-found.component";
import {AlertComponent} from "./components/alert/alert.component";
import {MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatInputModule} from "@angular/material/input";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {MatPaginatorModule, MatPaginatorIntl} from "@angular/material/paginator";
import {MatRadioModule} from "@angular/material/radio";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {EditCadComponent} from "./edit-cad/edit-cad.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {DimFormComponent} from "./edit-cad/dim-form.component";
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";
import {AssembleCadComponent} from "./assemble-cad/assemble-cad.component";
import {PrintCadComponent} from "@components/print-cad/print-cad.component";
import {ListCadComponent} from "@components/list-cad/list-cad.component";
import {MyMatPaginatorIntl} from "./MyMatPaginatorIntl";
import {PlaygroundComponent} from "@components/playground/playground.component";

@NgModule({
	declarations: [
		AppComponent,
		DrawCadComponent,
		LoadingComponent,
		PageNotFoundComponent,
		AlertComponent,
		EditCadComponent,
		DimFormComponent,
		AssembleCadComponent,
		PrintCadComponent,
		ListCadComponent,
		PlaygroundComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		BrowserAnimationsModule,
		StoreModule.forRoot(reducers, {
			metaReducers,
			runtimeChecks: {
				strictStateImmutability: true,
				strictActionImmutability: true
			}
		}),
		HttpClientModule,
		MatDialogModule,
		MatButtonModule,
		MatProgressSpinnerModule,
		MatInputModule,
		MatExpansionModule,
		MatIconModule,
		MatSelectModule,
		MatSnackBarModule,
		MatPaginatorModule,
		MatRadioModule,
		MatCheckboxModule,
		DragDropModule,
		FormsModule,
		ReactiveFormsModule
	],
	entryComponents: [],
	providers: [
		{provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 3000, verticalPosition: "top"}},
		{provide: MatPaginatorIntl, useClass: MyMatPaginatorIntl}
	],
	bootstrap: [AppComponent]
})
export class AppModule {}
