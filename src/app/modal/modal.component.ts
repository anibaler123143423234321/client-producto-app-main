import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CompraResponse } from '@app/pages/compra/store/save';
import { GeneralService } from '@app/services/general.service';
import { CompraService } from '@app/services/CompraService';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  estadoEditadoExitoso: boolean = false;
  mensajeExito = '';


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ModalComponent>,
    private CompraService: CompraService,
  ) {}


  closeModal() {
    this.dialogRef.close();
  }

  cambiarEstado(compra: CompraResponse): void {
    const estadosPosibles: string[] = [
      'Pendiente Por Revisar',
      'Despachado',
      'Pago Completado',
    ];

    const estadoActual = compra.estadoCompra;
    const indiceActual = estadosPosibles.indexOf(estadoActual);

    if (indiceActual !== -1) {
      // Encuentra el siguiente estado en la lista o vuelve al primero si es el último
      const nuevoIndice = (indiceActual + 1) % estadosPosibles.length;
      const nuevoEstado = estadosPosibles[nuevoIndice];

      const compraId = compra.id;

      this.CompraService.actualizarEstadoCompra(compraId, nuevoEstado).subscribe(
        (updatedCompra: CompraResponse) => {
          console.log('Nuevo Estado:', nuevoEstado);
          console.log('Compra ID:', compraId);

          this.estadoEditadoExitoso = true;
          this.mensajeExito = 'Estado Cambiado con Éxito';

          // Actualiza el estado en la compra actual
          compra.estadoCompra = nuevoEstado;

          setTimeout(() => {
            this.estadoEditadoExitoso = false;
            this.mensajeExito = '';
          }, 5000);
        },
        (error: Error) => {
          console.error('Error al actualizar el estado de compra:', error);
          // Manejar el error aquí, por ejemplo, mostrar un mensaje de error al usuario
        }

      );
    } else {
      console.log('Operación de actualización cancelada o estado no válido.');
    }
  }

}
