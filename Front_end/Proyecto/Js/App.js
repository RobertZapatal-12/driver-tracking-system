// Cargar sidebar automáticamente

fetch("sidebar.html")
.then(response => response.text())
.then(data => {
document.getElementById("sidebar").innerHTML = data;
});


// Cambiar contenido sin recargar página

function cargarPagina(pagina){

fetch("pages/" + pagina + ".html")

.then(response => response.text())

.then(data => {

document.getElementById("contenido").innerHTML = data;

});

}