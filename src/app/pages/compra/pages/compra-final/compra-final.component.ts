import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CarritoService } from '@app/services/CarritoService';
import * as fromActions from '../../store/save';
import { Store, select } from '@ngrx/store';
import { ProductoResponse } from '@app/pages/producto/store/save';
import { ProductoService } from '@app/services/ProductoService';
import { CompraCreateRequest } from '../../store/save';
import { Observable, Subscription } from 'rxjs';
import * as fromList from '@app/pages/producto/store/save';
import Swal from 'sweetalert2'; // Asegúrate de importar Swal al principio del archivo

@Component({
  selector: 'app-compra-final',
  templateUrl: './compra-final.component.html',
  styleUrls: ['./compra-final.component.scss'],
})
export class CompraFinalComponent implements OnInit, OnDestroy {
  arrayCompra: CompraCreateRequest[] = [];
  mostrarTabla = true;
  compraRealizada = false;

  productos$!: Observable<ProductoResponse[] | null>;
  productosSubscription: Subscription | null = null;
  actualizacionesCompletadas = 0; // Contador para rastrear actualizaciones completadas

  tipoEnvio: string | undefined;
tipoDePago: string | undefined;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public CarritoService: CarritoService,
    private store: Store,
    private productoService: ProductoService
  ) {}

  ngOnInit() {
    this.arrayCompra = this.CarritoService.getArrayCompra();
    // console.log('Contenido de arrayCompra:', this.arrayCompra);

    this.route.queryParams.subscribe((params) => {
      if (params['arrayCompra']) {
        const productosSeleccionados = JSON.parse(params['arrayCompra']);
        this.arrayCompra = productosSeleccionados;
        this.CarritoService.setArrayCompra(this.arrayCompra);
      }
    });

    this.productos$ = this.store.pipe(select(fromList.getProductos));
  }

  ngOnDestroy() {
    // Asegúrate de desuscribirte para evitar fugas de memoria
    if (this.productosSubscription) {
      this.productosSubscription.unsubscribe();
    }
  }

  eliminarProducto(compra: CompraCreateRequest) {
    const index = this.arrayCompra.indexOf(compra);
    if (index !== -1) {
      this.arrayCompra.splice(index, 1);
      localStorage.setItem('arrayCompra', JSON.stringify(this.arrayCompra));
    }
  }

  regresarAListado() {
    this.router.navigate(['../producto/list']);
  }

  limpiarPantalla() {
    this.arrayCompra = [];
    this.mostrarTabla = false;
  }

  realizarCompras() {
    if (!this.productosSubscription) {
      this.productosSubscription = this.productos$.subscribe((productos) => {
        if (productos && productos.length > 0) {
          const productosActualizados = new Set<number>();

          this.arrayCompra.forEach((compra) => {
            const producto = productos.find((p) => p.id === compra.productoId);

            if (producto && !productosActualizados.has(producto.id)) {
              productosActualizados.add(producto.id);

              this.productoService.actualizarProducto(producto.id, producto).subscribe(
                (productoActualizado) => {
                  // console.log('Producto actualizado:', productoActualizado);
                },
                (error) => {
                  console.error('Error al actualizar el producto:', error);
                }
              );
            }
          });
        }
      });
    }

    const productosSinStock: number[] = [];

    this.arrayCompra.forEach((compra) => {
      this.productoService.obtenerProducto(compra.productoId).subscribe((producto) => {
        if (producto.stock > 0) {
          compra.tipoEnvio = this.tipoEnvio;
          compra.tipoDePago = this.tipoDePago;
          this.store.dispatch(new fromActions.Create(compra));
        } else {
          console.error('No hay suficiente stock para el producto con ID:', compra.productoId);
          productosSinStock.push(compra.productoId);
          // Puedes mostrar un mensaje al usuario o realizar otra acción en este caso.
        }
      });
    });

    if (productosSinStock.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Los siguientes productos no tienen suficiente stock: ' + productosSinStock.join(', ')
      });
      this.arrayCompra = this.arrayCompra.filter((compra) => !productosSinStock.includes(compra.productoId));
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Compra realizada con éxito',
        showConfirmButton: false,
        timer: 3000
      });
      this.arrayCompra = [];
      this.CarritoService.clearCart();
      this.compraRealizada = true;

      setTimeout(() => {
        this.compraRealizada = false;
      }, 3000);
    }
  }
}
