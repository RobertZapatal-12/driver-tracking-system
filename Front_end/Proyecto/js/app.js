// esperar a que cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
    // cargar página inicial
    cargarPagina("dashboard");

    // cargar sidebar
    fetch("components/sidebar.html")
        .then(response => response.text())
        .then(data => {

            document.getElementById("sidebar").innerHTML = data;

            // activar botones del sidebar después de cargarlo
            activarMenu();
        })
        .catch(error => console.error("Error cargando sidebar:", error));
});


// función para activar botones del menú
function activarMenu(){

  const links = document.querySelectorAll("[data-pagina]");

  links.forEach(link => {
    link.addEventListener("click", (e) => {

      e.preventDefault();

      const pagina = link.getAttribute("data-pagina");

      cargarPagina(pagina);

    });
  });

}


// cambiar contenido
function cargarPagina(pagina){

  fetch(`pages/${pagina}.html`)
    .then(res => res.text())
    .then(data => {

      const contenedor = document.getElementById("contenido");

      contenedor.innerHTML = data;

      // ejecutar scripts dentro del contenido cargado
      const scripts = contenedor.querySelectorAll("script");

      scripts.forEach(script => {
        const nuevoScript = document.createElement("script");

        if(script.src){
          nuevoScript.src = script.src;
        }else{
          nuevoScript.textContent = script.textContent;
        }

        document.body.appendChild(nuevoScript);
        script.remove();
      });

    })
    .catch(error => console.error("Error cargando página:", error));

}