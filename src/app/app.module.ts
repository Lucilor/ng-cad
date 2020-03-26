import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {DrawCadComponent} from "./draw-cad/draw-cad.component";
import {LoadingComponent} from "./loading/loading.component";
import {StoreModule} from "@ngrx/store";
import {reducers, metaReducers} from "./store/reducers";
import {HttpClientModule} from "@angular/common/http";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {IndexComponent} from "./index/index.component";
import {AlertComponent} from "./alert/alert.component";
import {MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatInputModule} from "@angular/material/input";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {EditCadComponent} from "./edit-cad/edit-cad.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {DimFormComponent} from "./edit-cad/dim-form.component";
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";
import { AssembleCadComponent } from './assemble-cad/assemble-cad.component';

@NgModule({
	declarations: [
		AppComponent,
		DrawCadComponent,
		LoadingComponent,
		PageNotFoundComponent,
		IndexComponent,
		AlertComponent,
		EditCadComponent,
		DimFormComponent,
		AssembleCadComponent
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
		FormsModule,
		ReactiveFormsModule
	],
	entryComponents: [AlertComponent, DimFormComponent],
	providers: [{provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 3000, verticalPosition: "top"}}],
	bootstrap: [AppComponent]
})
export class AppModule {}
