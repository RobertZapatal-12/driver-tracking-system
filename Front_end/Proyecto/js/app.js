// cargar sidebar

fetch("components/sidebar.html")
.then(response => response.text())
.then(data => {

document.getElementById("sidebar").innerHTML = data;

});


// cambiar contenido

function cargarPagina(pagina){

fetch(`pages/${pagina}.html`)
.then(res => res.text())
.then(data => {

document.getElementById("contenido").innerHTML = data;

});

};
