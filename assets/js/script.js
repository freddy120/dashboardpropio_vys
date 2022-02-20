/**
 * Fuente de datos y modelado
 */

// Conectamos nuestra aplicación al API de coincap.
// Vamos a solicitar actualizaciones de precios para: bitcoin, ethereum, monero y litecoin.
var preciosEndPoint = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum,monero,litecoin');

// Cuando una de las criptomonedas cambia de precio, ejecutamos la función procesarNuevoMensaje.
preciosEndPoint.onmessage = procesarNuevoMensaje;

/**
 * Preprocesamiento y Modelado:
 * El API nos envía sólo 1 tipo de dato que es el precio actual de las criptomonedas.
 * A pesar de esto, podemos hacer cálculos matemáticos para producir una estructura de datos que nos permita darle sentido al cambio de precios que vamos a mostrar en la visualización.
 */
const monedas = [
    { nombre: 'bitcoin', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
    { nombre: 'ethereum', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
    { nombre: 'monero', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
    { nombre: 'litecoin', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
];

// Función que recibe los mensajes del Socket
function procesarNuevoMensaje(mensaje) {
    // Convertimos los datos de texto a formato JSON
    var mensajeJson = JSON.parse(mensaje.data);

    //console.log(mensajeJson)
    // Iteramos sobre los valores del mensaje que vienen en parejas de "nombre": "precio"
    for (var nombreMoneda in mensajeJson) {
        // En el siguiente loop, pasamos por cada objeto que definimos en la variable "monedas" que contiene la nueva estructura de datos que queremos llenar.
        for (var i = 0; i < monedas.length; i++) {
            // objetoMoneda va a ser cada uno de los objetos del modelado, por ejemplo:
            // cuando i = 0, objetoMoneda es: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
            var objetoMoneda = monedas[i];

            // Comparamos el nombre de la moneda en nuestro modelo con el nombre de la moneda que cambió de valor y fue enviado por la API en el mensaje actual.
            // Si coinciden, significa que podemos actualizar los datos de nuestro modelo para esa moneda
            if (objetoMoneda.nombre === nombreMoneda) {
                // Extraemos el precio actual que llegó en el mensaje y lo guardamos en una variable para usarla varias veces de ahora en adelante.
                var nuevoPrecio = mensajeJson[nombreMoneda];

                // En JavaScript, podemos insertar un nuevo elemento a un array usando push()
                // Aquí estamos sumando una nueva entrada a los datos de la moneda que acaba de cambiar el precio.
                // En nuestra estructura de modelado: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
                // va a quedar guardada en el array "datos"
                objetoMoneda.datos.push({
                    fecha: Date.now(), // Este va a ser nuestro eje X, usamos la fecha del presente ya que la aplicación funciona en tiempo real.
                    precio: nuevoPrecio, // El eje Y en la visualización va a ser el precio.
                });

                // Volviendo a la estructura: {nombre: "bitcoin", precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: []}
                // podemos cambiar directamente el precioActual de la moneda con el precio que acaba de llegar de la API.
                objetoMoneda.precioActual = nuevoPrecio;

                // Ahora hagamos algo más interesante, vamos a guardar el precio más alto al que ha llegado la moneda.
                // La siguiente comparación revisa si el valor NO es "null" con: !objetoMoneda.precioMasAlto,
                // O si el precio que acaba de llegar es mayor al precioMasAlto guardado en nuestro modelo.
                if (!objetoMoneda.precioMasAlto || objetoMoneda.precioMasAlto < nuevoPrecio) {
                    // Si alguna de estas dos pruebas es verdadera, cambiamos el precioMasAlto en el modelo.
                    objetoMoneda.precioMasAlto = nuevoPrecio;
                }
                // Hacemos lo mismo para el precioMasBajo haciendo la comparación invertida.
                if (!objetoMoneda.precioMasBajo || objetoMoneda.precioMasBajo > nuevoPrecio) {
                    objetoMoneda.precioMasBajo = nuevoPrecio;
                }

                // Para terminar, actualizamos la gráfica que tengamos seleccionada en el menú
                if (nombreMoneda === menu.value) {
                    actualizar(monedas[i]);
                }
            }
        }
    }
}
/** FIN de Preprocesamiento y modelado. */

/**
 * Visualización y textos dinámicos
 */

// En JavaScript podemos extraer elementos del HTML para actualizar su contenido dinámicamente.
// Si van al archivo index.html van a ver que hay 2 elementos vacíos con los siguientes ids: <p id="contexto1"></p>  <p id="contexto2"></p>
// Los vamos a guardar en variables para luego insertar el contenido a medida que los datos se actualizan.
var contexto1 = document.getElementById('contexto1');
var contexto2 = document.getElementById('contexto2');

// Este objeto es una ayuda nativa de JavaScript para convertir números a un formato de moneda.
// Pueden leer más en: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
var formatoUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Gráfica
 */
// Pueden cambiar los valores de estas variables para cambiar el tamaño del contenedor.
// Usamos margenes para darle espacio a los textos de cada eje.
var margen = { top: 10, right: 30, bottom: 30, left: 100 };
var ancho = 800 - margen.left - margen.right;
var alto = 400 - margen.top - margen.bottom;

// En D3 seleccionamos el elemento de HTML donde vamos a insertar la gráfica, en index.html es: <div id="modulo2"></div>
const svg = d3
    .select('#modulo2') // elemento existente en el HTML para insertar gráfica
    .append('svg')
    .attr('width', ancho + margen.left + margen.right)
    .attr('height', alto + margen.top + margen.bottom)
    .append('g')
    .attr('transform', `translate(${margen.left},${margen.top})`);

// Definición general de cada eje:

// El eje x es el tiempo que en nuestros datos guardamos en cada instancia usando Date.now(), que representa la fecha
// D3 puede procesar fechas usando la escala "scaleTime()"
// El rango va de 0 al ancho de la gráfica.
const x = d3.scaleTime().range([0, ancho]);
const ejeX = d3.axisBottom().scale(x);
svg.append('g').attr('transform', `translate(0, ${alto})`).attr('class', 'ejeX');

// El eje Y representa la variación de precios.
// Usamos la escala lineal en D3:
const y = d3.scaleLinear().range([alto, 0]);
const ejeY = d3.axisLeft().scale(y);
svg.append('g').attr('class', 'ejeY');

// Esta función la ejecutamos cuando hay datos nuevos o al cambiar la criptomoneda en el menú.
// Recibe el objeto completo de una criptomoneda como lo definimos en el modelo.
// Por ejemplo: { nombre: 'bitcoin', precioActual: null, precioMasAlto: null, precioMasBajo: null, datos: [] },
function actualizar(objetoMoneda) {
    // Este texto es una combinación entre textos estáticos y variables.
    // De momento no es muy descriptivo, deben modificarlo para comenzar a ser más claros con el público general.
    // El que ven en el ejemplo terminado es:
    // contexto1.innerText = "Actualmente, el precio de " + menu.value + " es de: " + formatoUSD.format(objetoMoneda.precioActual) + " USD.";

    var d = new Date()

    contexto1.innerHTML = 'Precio ' + menu.value.charAt(0).toUpperCase() + menu.value.slice(1) + ' al '+ d.toLocaleString() +
    ' <h2>' + formatoUSD.format(objetoMoneda.precioActual) + ' USD.</h2>';

    // Para el segundo texto vamos a hacer comparaciones entre el precio inicial y el actual.
    // El texto va a indicar si es igual, ha subido o bajado y la diferencia de cuánto ha cambiado el precio.
    var precioInicial = objetoMoneda.datos[0].precio;

    if (precioInicial < objetoMoneda.precioActual) {
        var diferencia = objetoMoneda.precioActual - precioInicial;
        contexto2.innerHTML = '<h3>Subió +' + formatoUSD.format(diferencia) + '</h3>';
        contexto2.style.color = 'green';
    } else if (precioInicial > objetoMoneda.precioActual) {
        var diferencia = precioInicial - objetoMoneda.precioActual;
        contexto2.innerHTML = '<h3>Bajó -' + formatoUSD.format(diferencia) + '</h3>';
        contexto2.style.color = 'red';
    } else {
        contexto2.innerHTML = 'Igual = 0';
        contexto2.style.color = 'blue';
    }

    // El eje X que definimos antes lo actualizamos con un método de d3 que busca el rango de fechas en todos los datos disponibles hasta el momento.
    // Van a ver que al principio este rango es muy pequeño y se va incrementando a medida que hay más datos.
    // Los dominios en d3 se definen con un array con dos valores, el primero es el mínimo y el segundo el máximo:
    // x.domain([min, max])
    x.domain(
        d3.extent(objetoMoneda.datos, function (d) {
            return d.fecha;
        })
    );
    // Hace una transición animada al actualizar el ejeX, la duración es de 300 milisegundos
    svg.selectAll('.ejeX').transition().duration(300).call(ejeX);

    // Otra forma de definir el rango del dominio es buscar el menor y mayor valor en los datos.
    // El método d3.extent hace exactamente lo mismo, pero dejo este diferente como ejemplo.
    // Intenten cambiar esto por: y.domain([0, d3.max(objetoMoneda.datos, function (d) { return d.precio; })]);
    // y verán que es difícil ver los cambios. Acá estamos cortando la base para que no comience en 0 sino en el menor precio.

    y.domain([
        d3.min(objetoMoneda.datos, function (d) {
            return d.precio;
        }),
        d3.max(objetoMoneda.datos, function (d) {
            return d.precio;
        }),
    ]);
    svg.selectAll('.ejeY').transition().duration(300).call(ejeY);

    // Pasamos los datos actuales a la línea que vamos a pintar
    const linea = svg.selectAll('.linea').data([objetoMoneda.datos], function (d) {
        return d;
    });

    // Finalmente pintamos la línea
    linea
        .join('path')
        .attr('class', 'linea')
        .transition()
        .duration(300)
        .attr(
            'd',
            d3
                .line()
                .x(function (d) {
                    return x(d.fecha); // El eje X son las fechas
                })
                .y(function (d) {
                    return y(d.precio); // El eje Y son los precios
                })
        )
        .attr('fill', 'none')
        .attr('stroke', '#42b3f5') // Pueden cambiar el color de la línea
        .attr('stroke-width', 2.5); // Grosor de la línea
}

// FIN de Visualización y textos dinámicos

/**
 * MENÚ
 */
var menu = document.getElementById('menuMonedas');

menu.onchange = function () {
    var objetoMoneda = monedas.find(function (obj) {
        return obj.nombre === menu.value;
    });
    actualizar(objetoMoneda);
};
// ----- FIN MENÚ ----