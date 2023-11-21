import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms'; // Importa FormsModule

import { CompraNuevoRoutingModule } from './compra-nuevo-routing.module';
import { CompraNuevoComponent } from './compra-nuevo.component';

import { MatFormFieldModule } from '@angular/material/form-field'; // Importa MatFormFieldModule
import { MatInputModule } from '@angular/material/input'; // Importa MatInputModule u otros módulos que puedas necesitar
import { MatExpansionModule } from '@angular/material/expansion';


@NgModule({
  declarations: [
    CompraNuevoComponent
  ],
  imports: [
    CommonModule,
    CompraNuevoRoutingModule,
    MatFormFieldModule, // Asegúrate de que esté aquí
    MatInputModule,
    MatExpansionModule,

    FormsModule // Agrega FormsModule aquí
  ]
})
export class CompraNuevoModule { }
