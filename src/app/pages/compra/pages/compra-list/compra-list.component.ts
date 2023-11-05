import { Component, Input, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable, map } from 'rxjs';
import * as fromList from '../../store/save';
import { CompraResponse } from '../../store/save';
import * as fromRoot from '@app/store';
import { GeneralService } from '@app/services/general.service';
import { MatDialog } from '@angular/material/dialog';
import { User } from '@app/models/backend/user/index';
import { Router } from '@angular/router';
import * as fromActions from '../../store/save';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CompraService } from '@app/services/CompraService';
import { NegocioService } from '@app/services/NegocioService';
import * as fromUser from '@app/store/user';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-compra-list',
  templateUrl: './compra-list.component.html',
  styleUrls: ['./compra-list.component.scss'],
})
export class CompraListComponent implements OnInit {
  compras$: Observable<CompraResponse[] | null>;
  loading$!: Observable<boolean | null>;
  comprasLength: number;

  compraGroups: { [key: string]: CompraResponse[] } = {};
  paginatedCompras$: Observable<CompraResponse[] | null>;

  @Input() user!: User | null;
  estadoEditadoExitoso: boolean = false;
  mensajeExito = '';
  idUser: number | undefined;
  nombreUsuario: string;
  apellidoUsuario: string;
  idNegocioUser: string | undefined;

  currentPage = 1;
  itemsPerPage = 15;
  boletaUrl!: SafeUrl;
  negocioPicture: string = ''; // Declaramos la variable negocioPicture aquí
  user$!: Observable<fromUser.UserResponse>;
  isAuthorized$!: Observable<boolean>;

  constructor(
    private store: Store<fromRoot.State>,
    public generalService: GeneralService,
    private router: Router,
    public negocioService: NegocioService,
    public compraService: CompraService,
    private cd: ChangeDetectorRef

  ) {
    this.comprasLength = 0;
    this.nombreUsuario = '';
    this.apellidoUsuario = '';
    this.compras$ = this.store.pipe(select(fromList.getCompras));
    this.paginatedCompras$ = this.compras$.pipe(
      map((compras) => {
        if (!compras) {
          return null;
        }
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        return compras.slice(startIndex, startIndex + this.itemsPerPage);
      })
    );
  }

  ngOnInit(): void {
    this.user$ = this.store.pipe(
      select(fromUser.getUser)
    ) as Observable<fromUser.UserResponse>;
    this.isAuthorized$ = this.store.pipe(
      select(fromUser.getIsAuthorized)
    ) as Observable<boolean>;

    this.store.dispatch(new fromList.Read());
    this.loading$ = this.store.pipe(select(fromList.getLoading));

    this.compras$.subscribe((compras) => {
      if (compras) {
        this.comprasLength = compras.length;
        this.compraGroups = this.groupComprasByFecha(compras);
      }
    });

    this.nombreUsuario = this.generalService.usuario$?.nombre || '';
    this.apellidoUsuario = this.generalService.usuario$?.apellido || '';
    this.idUser = this.generalService.usuario$?.id;
    this.idNegocioUser = this.generalService.usuario$?.negocioId || '';

    // Obtener la información de negocio.picture
    if (this.idNegocioUser) {
      this.negocioService
        .getNegocioById(Number(this.idNegocioUser))
        .subscribe((negocio) => {
          if (negocio && negocio.picture) {
            this.negocioPicture = negocio.picture;
          }
        });
    }
  }

  navigateToProductoNuevo(): void {
    this.router.navigate(['../../producto/list']);
  }

  changePage(step: number): void {
    this.currentPage += step;
  }

  generarPDF(compraGroups: CompraResponse[][]): void {
    compraGroups.forEach((compras, index) => {
      // Verificar si todas las compras tienen el estado "Pago Completado"
      const todasComprasPagadas = compras.every(
        (compra) => compra.estadoCompra === 'Pago Completado'
      );

      if (todasComprasPagadas) {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [80, 100],
        });

        compras.forEach((compra) => {
          if (compra.fechaCompra) {
            const fecha = this.calcularFechaDiferencia(compra.fechaCompra);
            compra.fechaCompra = fecha ? fecha.toLocaleString() : 'Fecha no proporcionada';
          } else {
            compra.fechaCompra = 'Fecha no proporcionada';
          }
        });

        const usuario = `${this.nombreUsuario} ${this.apellidoUsuario}`;
        const primeraCompra = compras[0];
        const fechaCompra = compras.length > 0 ? compras[0].fechaCompra : null;
        const idsCompra = compras
          .map((compra) => compra.codigo?.toString())
          .join(', ');
        const idsProducto = compras
          .map((compra) => compra.productoId.toString())
          .join(', ');
        const nombresProductos = compras
          .map((compra) => compra.titulo.toString())
          .join(', ');
        const precioTotal = this.getTotalPrecio(compras);
        const precioCompra = compras.map((compra) => compra.precioCompra);
        const cantidad = compras.map((compra) => compra.cantidad);
        // Obtén el DNI del usuario
        const dniUsuario =
          this.generalService.usuario$?.dni || 'DNI no proporcionado';

        // Verifica si hay un negocio asociado al usuario y obtén sus detalles
        let negocioNombre = '';
        let negocioDireccion = '';
        let negocioRUC = '';
        if (this.idNegocioUser) {
          this.negocioService
            .getNegocioById(Number(this.idNegocioUser))
            .subscribe((negocio) => {
              if (negocio) {
                negocioNombre = negocio.nombre || 'Sin nombre';
                negocioDireccion = negocio.direccion || 'Sin dirección';
                negocioRUC = negocio.ruc || 'Sin RUC';

                // Ajustar las posiciones de texto
                doc.setFontSize(8);
                doc.setFont('normal');
                // Centrar el nombre del negocio
                const nombreWidth =
                  (doc.getStringUnitWidth(negocioNombre) * 3) /
                  doc.internal.scaleFactor; // 8 es el tamaño de fuente
                const nombreX = (80 - nombreWidth) / 2;
                doc.text(negocioNombre, nombreX, 4); // Reducir la coordenada Y

                doc.setFontSize(6);
                // Centrar la dirección
                const direccionWidth =
                  (doc.getStringUnitWidth(negocioDireccion) * 3) /
                  doc.internal.scaleFactor; // 6 es el tamaño de fuente
                const direccionX = (80 - direccionWidth) / 2;
                doc.text(negocioDireccion, direccionX, 7);
                // Centrar el RUC
                const rucWidth =
                  (doc.getStringUnitWidth(negocioRUC) * 3) /
                  doc.internal.scaleFactor; // 6 es el tamaño de fuente
                const rucX = (80 - rucWidth) / 2;
                doc.text(`RUC: ${negocioRUC}`, rucX, 10); // Ajustar la coordenada Y
                doc.line(5, 11, 85, 11);
                doc.setFontSize(6);
                doc.text('NOTA DE VENTA', 36, 13); // Ajustar la coordenada Y
                doc.text(`CODIGOS DE COMPRAS: ${idsCompra}`, 5, 16); // Ajustar la coordenada Y
                doc.line(5, 17, 85, 17);
                doc.setFontSize(6);
                doc.text(`CLIENTE: ${usuario}`, 5, 19); // Ajustar la coordenada Y
                doc.text(`DNI / RUC: ${dniUsuario}`, 5, 22); // Ajustar la coordenada Y
                doc.text(`FECHA DE EMISIÓN: ${fechaCompra}`, 5, 25); // Ajustar la coordenada Y
                doc.line(5, 26, 85, 26);

                doc.setFontSize(6);

                // Textos arriba

                doc.text('CONCEPTO', 5, 28); // Ajustar la coordenada Y
                doc.text('CANTIDAD', 36, 28); // Ajustar la coordenada Y
                doc.text('PRECIO TOTAL', 70, 28); // Ajustar la coordenada Y

                doc.line(5, 29, 85, 29);
                // Datos abajo en columnas
                const dataStartY = 31; // Coordenada Y inicial para los datos
                const lineHeight = 2; // Altura de cada línea
                compras.forEach((compra, i) => {
                  const posY = dataStartY + i * lineHeight;
                  doc.text(compra.titulo, 5, posY);
                  doc.text(compra.cantidad.toString(), 40, posY); // Agrega la cantidad
                  doc.text(`S/${compra.precioCompra.toFixed(2)}`, 70, posY); // Agrega el precio de cada producto
                });
                doc.line(5, 74, 85, 74);
                doc.line(5, 77, 85, 77);

                const precioTotalNumber = parseFloat(precioTotal);
                doc.text(
                  `IMPORTE TOTAL: S/${precioTotalNumber.toFixed(2)}`,
                  5,
                  73
                );
                doc.text('GRACIAS POR SU COMPRA, LO ESPERAMOS PRONTO', 5, 76); // Ajustar la coordenada Y
                doc.text('Generado desde Software Dotval', 5, 79); // Ajustar la coordenada Y

                // Muestra el cuadro de diálogo cuando la llamada asincrónica se complete
                Swal.fire({
                  icon: 'success',
                  title: 'PDF generado',
                  text: 'El PDF se ha generado exitosamente.',
                  timer: 3000, // Cierra automáticamente después de 3 segundos (ajusta el tiempo según tus preferencias)
                  showConfirmButton: false, // Oculta el botón "OK"
                });

                // Programa el cierre del cuadro de diálogo después de un tiempo
                setTimeout(() => {
                  Swal.close();
                  this.cd.detectChanges();
                }, 3000); // Cierra automáticamente después de 3 segundos (ajusta el tiempo según tus preferencias)

                // Guardar el PDF
                doc.save(`boleta_${idsProducto}_${usuario}_${index}.pdf`);
              }
            });
        } else {
          // Si no hay negocio asociado, crea el PDF sin los detalles del negocio
          doc.setFontSize(8);
          doc.setFont('normal');
          doc.text('Nota de Venta', 10, 12); // Ajustar la coordenada Y
          doc.text('Información de las Compras:', 5, 18); // Ajustar la coordenada Y

          // Agregar las líneas debajo de nota de venta
          doc.line(5, 30, 75, 30);
          doc.line(5, 31, 75, 31);
          doc.line(5, 32, 75, 32);

          doc.setFontSize(6);
          doc.text(`Nombre del Usuario: ${usuario}`, 5, 24); // Ajustar la coordenada Y
          doc.text(`DNI del Usuario: ${dniUsuario}`, 5, 30); // Ajustar la coordenada Y
          doc.text(`Fecha de Emisión: ${fechaCompra}`, 5, 36); // Ajustar la coordenada Y
          doc.text(`Codigos de las Compra: ${idsCompra}`, 5, 42); // Ajustar la coordenada Y
          doc.text(`Codigos de los Productos: ${idsProducto}`, 5, 48); // Ajustar la coordenada Y
          doc.text(`Nombre del Producto: ${nombresProductos}`, 5, 54); // Ajustar la coordenada Y
          doc.text(
            `Precio Total de los Productos a pagar: $${precioTotal}`,
            5,
            60
          ); // Ajustar la coordenada Y

          doc.save(`boleta_${idsProducto}_${usuario}_${index}.pdf`);

          // Muestra el cuadro de diálogo
          Swal.fire({
            icon: 'success',
            title: 'PDF generado',
            text: 'El PDF se ha generado exitosamente.',
          });
        }
      } else {
        // Muestra un cuadro de diálogo de error cuando no todas las compras están pagadas
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No todas las compras están pagadas',
        });
      }

    });
  }

  // Actualiza esta función para agrupar solo por minuto
  groupComprasByFecha(compras: CompraResponse[]): {
    [key: string]: CompraResponse[];
  } {
    const groupedCompras: { [key: string]: CompraResponse[] } = {};

    compras.forEach((compra) => {
      const fechaCompraKey = new Date(compra.fechaCompra).toLocaleString(
        undefined,
        {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        }
      ); // Usar la fecha con hora y minutos
      if (!groupedCompras[fechaCompraKey]) {
        groupedCompras[fechaCompraKey] = [];
      }
      groupedCompras[fechaCompraKey].push(compra);
    });

    return groupedCompras;
  }

  getTotalPrecio(compras: CompraResponse[]): string {
    const total = compras.reduce((sum, compra) => sum + compra.precioCompra, 0);
    return total.toFixed(2);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  getTotalCantidad(compras: CompraResponse[]): number {
    const totalCantidad = compras.reduce(
      (sum, compra) => sum + compra.cantidad,
      0
    );
    return totalCantidad;
  }

  calcularFechaDiferencia(fechaCompraStr: string): Date | null {
    const fechaCompra = new Date(fechaCompraStr);
    if (isNaN(fechaCompra.getTime())) {
      return null;
    }
    fechaCompra.setHours(fechaCompra.getHours() - 5); // Restar 5 horas
    return fechaCompra;
  }

}
