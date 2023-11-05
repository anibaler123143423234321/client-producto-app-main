import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { GeneralService } from '@app/services/general.service';
import * as fromActions from '../../store/save'; // Importa la acción Create
import { CarritoService } from '@app/services/CarritoService';
import { ProductoService } from '@app/services/ProductoService'; // Importa el servicio de productos
import { CompraCreateRequest } from '../../store/save'; // Asegúrate de importar correctamente el modelo CompraCreateRequest
import Swal from 'sweetalert2';

@Component({
  selector: 'app-compra-nuevo',
  templateUrl: './compra-nuevo.component.html',
  styleUrls: ['./compra-nuevo.component.scss'],
})
export class CompraNuevoComponent implements OnInit {
  userId: number = 0;
  nombreProducto: string = '';
  tipoEnvio: string = '';
  tipoDePago: string = '';
  nombreUsuario: string | undefined;
  apellidoUsuario: string | undefined;
  productoId: number = 0;
  precio: number = 0;
  compraRealizada: boolean = false;
  cantidad: number = 0; // Agrega la propiedad cantidad
  stockDisponible: number = 0; // Agrega el stock disponible

  constructor(
    private store: Store,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public GeneralService: GeneralService,
    public CarritoService: CarritoService,
    private productoService: ProductoService // Inyecta el servicio de productos
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const productoId = +params['productoId'];
      const userId = +params['userId'];
      const nombreProducto = params['nombreProducto'];
      const nombreUsuario = params['nombreUsuario'];
      const apellidoUsuario = params['apellidoUsuario'];
      const precioProducto = +params['precioProducto'];
      const estadoCompra = params['estadoCompra'];

      if (isNaN(productoId) || isNaN(precioProducto)) {
        console.log('Valores no válidos en la URL');
        return;
      }

      this.productoId = productoId;
      this.userId = userId;
      this.nombreProducto = nombreProducto;
      this.nombreUsuario = this.GeneralService.usuario$?.nombre;
      this.apellidoUsuario = this.GeneralService.usuario$?.apellido;
      this.precio = precioProducto;

      // Obtén el stock disponible del producto
      this.productoService.obtenerProducto(productoId).subscribe(
        (producto) => {
          this.stockDisponible = producto.stock;
        },
        (error) => {
          console.error('Error al obtener el stock del producto:', error);
        }
      );
    });
  }

  realizarCompra() {
    const estadoCompra = 'Pendiente Por Revisar';

    if (!this.nombreProducto || !this.tipoEnvio || !this.tipoDePago || this.cantidad <= 0) {
      console.log('Todos los campos deben llenarse correctamente para realizar la compra');
      return;
    }

    if (this.cantidad <= 0) {
      console.log('La cantidad debe ser mayor que cero para realizar la compra');
      return;
    }

    if (this.cantidad > this.stockDisponible) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La cantidad seleccionada supera el stock disponible. Verifica la cantidad de stock disponible antes de comprar.'
      });
      return;
    }

    this.productoService.obtenerProducto(this.productoId).subscribe(
      (producto) => {
        if (this.cantidad > producto.stock) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'La cantidad seleccionada supera el stock disponible. Verifica la cantidad de stock disponible antes de comprar.'
          });
        } else {
          const compra: CompraCreateRequest = {
            titulo: this.nombreProducto,
            cantidad: this.cantidad,
            productoId: this.productoId,
            userId: this.userId,
            precioCompra: this.precio,
            estadoCompra: estadoCompra,
            tipoEnvio: this.tipoEnvio,
            tipoDePago: this.tipoDePago,
          };

          this.store.dispatch(new fromActions.Create(compra));

          const nuevoProducto = {
            id: this.productoId,
            nombre: this.nombreProducto,
            picture: '', // Proporciona la URL de la imagen del producto
            precio: 0, // Proporciona el precio del producto
            stock: producto.stock - this.cantidad,
          };

          this.productoService.actualizarProducto(this.productoId, nuevoProducto).subscribe(
            () => {
              console.log('Actualización del stock del producto exitosa');
              Swal.fire({
                icon: 'success',
                title: 'Compra realizada con éxito',
                showConfirmButton: false,
                timer: 3000
              });
            },
            (error) => {
              console.error('Error al actualizar el stock del producto:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un error al actualizar el stock del producto. Inténtalo nuevamente.'
              });
            }
          );

        //  this.compraRealizada = true;

          this.cantidad = 0;
        }
      },
      (error) => {
        console.error('Error al verificar el stock del producto:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un error al verificar el stock del producto. Inténtalo nuevamente.'
        });
      }
    );
  }

}
