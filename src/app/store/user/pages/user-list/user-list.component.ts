// Importa las dependencias necesarias
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { UserResponse } from '../../user.models';
import * as fromActions from '@app/store/user/user.actions';
import * as fromSelectors from '@app/store/user/user.selectors';
import { CompraResponse } from '@app/pages/compra/store/save';
import * as fromRoot from '@app/store';
import { CompraService } from '@app/services/CompraService';
import { GeneralService } from '@app/services/general.service';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ModalComponent } from '@app/modal/modal.component';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit, OnDestroy {
  users$: Observable<UserResponse[] | null>;
  loading$: Observable<boolean | null>;
  searchTerm: string = '';
  filteredUsers: UserResponse[] = [];

  compras$!: Observable<CompraResponse[] | null>;
  // Crear un diccionario para asociar compras con usuarios
  userComprasMap: { [userId: number]: CompraResponse[] } = {}; // Mapa de compras por usuario
  estadoEditadoExitoso: boolean = false;
  mensajeExito = '';

  idNegocioUser: string | undefined;

  displayedColumns: string[] = [
    'negocioId',
    'nombre',
    'apellido',
    'telefono',
    'email',
    'role',
    'compras',
  ];
  private loggedIn = true; // Variable para rastrear el estado de inicio de sesión
  private intervalSubscription: any; // Variable para rastrear la suscripción al intervalo
  private compraSubscription: Subscription | undefined;

  constructor(
    private store: Store<fromRoot.State>,
    private dialog: MatDialog,
    public CompraService: CompraService,
    public GeneralService: GeneralService
  ) {
    this.users$ = this.store.select(fromSelectors.getUsers);
    this.loading$ = this.store.select(fromSelectors.getLoading);
  }

  ngOnInit() {
    this.store.dispatch(new fromActions.ListUsers());
    this.idNegocioUser = this.GeneralService.usuario$?.negocioId;

    // Llama a cargarDatosDeCompras inicialmente
    this.CompraService.cargarDatosDeCompras().subscribe((compras) => {
      console.log('Datos de compras cargados:', compras);
      console.log('idNegocioUser:', this.idNegocioUser);

      this.compras$ = of(compras);

      this.users$.subscribe((users) => {
        if (users) {
          this.filteredUsers = users.filter(
            (user) => user.negocioId === this.idNegocioUser
          );
          this.userComprasMap = this.filterComprasByUser(this.filteredUsers);
        }
      });
    });
    // Llama a cargarDatosDeCompras cada 10 segundos
    this.intervalSubscription = interval(10000) // Intervalo de 10 segundos
      .pipe(switchMap(() => this.CompraService.cargarDatosDeCompras()))
      .subscribe((compras) => {
        if (this.loggedIn) {
          console.log('Datos de compras actualizados automáticamente:', compras);
          this.compras$ = of(compras);
          this.userComprasMap = this.filterComprasByUser(this.filteredUsers);
        } else {
          // El usuario ha cerrado sesión, detener el intervalo
          this.intervalSubscription.unsubscribe();
        }
      });
  }

  ngOnDestroy() {
    // Al cerrar sesión, detén la suscripción
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
    this.loggedIn = false;

    if (this.compraSubscription) {
      this.compraSubscription.unsubscribe();
    }
  }

  // Función de filtro de usuarios
  filterUsers(users: UserResponse[], term: string): UserResponse[] {
    term = term.toLowerCase();
    return users.filter((user) => {
      // Verificar si 'role' existe antes de intentar acceder a él
      if (user.role) {
        return (
          user.nombre.toLowerCase().includes(term) ||
          user.apellido.toLowerCase().includes(term) ||
          user.telefono.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.role.toLowerCase().includes(term)
        );
      }
      // Si 'role' es undefined, no incluir este usuario en los resultados
      return false;
    });
  }

  shouldRemoveUser(user: UserResponse): boolean {
    if (!this.userComprasMap[user.id]) {
      return true; // Elimina si el usuario no tiene compras en el modal.
    } else {
      // Verifica si todas las compras del usuario están en estado "Completado".
      return this.userComprasMap[user.id].every(
        (compra) => compra.estadoCompra === 'Completado'
      );
    }
  }

 // En la función updateFilteredUsers, después de filtrar los usuarios, verifica si algún usuario debe eliminarse.
 updateFilteredUsers() {
  if (this.users$) {
    // Desencadenar el observable y luego aplicar el filtro
    this.users$.subscribe((users) => {
      if (users) {
        this.filteredUsers = this.filterUsers(users, this.searchTerm);

        // Filtra y elimina usuarios que deben eliminarse.
        this.filteredUsers = this.filteredUsers.filter((user) =>
          this.shouldRemoveUser(user)
        );
      }
    });
  }
}


  // Dentro de la función filterComprasByUser, verifica si todas las compras del usuario están en estado "Completado".
filterComprasByUser(users: UserResponse[]): {
  [userId: number]: CompraResponse[];
} {
  const filteredMap: { [userId: number]: CompraResponse[] } = {};

  // Obtén las compras del estado global una vez
  this.compras$.subscribe((comprasData) => {
    if (comprasData) {
      users.forEach((user) => {
        if (user.id) {
          const compras = this.filterComprasByUserId(comprasData, user.id);
          if (compras.length > 0) {
            filteredMap[user.id] = compras;

            // Verificar si todas las compras están en estado "Completado"
            const todasCompletadas = compras.every(
              (compra) => compra.estadoCompra === 'Completado'
            );

            if (!todasCompletadas) {
              // Agregar el usuario solo si no todas las compras están completadas
              filteredMap[user.id] = compras;
            }
          }
        }
      });
    }
  });

  return filteredMap;
}

  // Función para filtrar compras por el ID de usuario
  filterComprasByUserId(
    comprasData: CompraResponse[],
    userId: number
  ): CompraResponse[] {
    return comprasData.filter((compra) => {
      return (
        compra.userId === userId &&
        (compra.estadoCompra === 'Pendiente Por Revisar' ||
          compra.estadoCompra === 'Despachado')
      );
    });
  }



  openModal(compras: CompraResponse[]) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { compras }; // Pasar los datos de compras al modal

    const dialogRef = this.dialog.open(ModalComponent, dialogConfig);

    // Puedes suscribirte a eventos del modal si es necesario
    dialogRef.afterClosed().subscribe((result) => {
      // Aquí puedes realizar acciones después de que se cierre el modal
    });
  }
}
