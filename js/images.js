let pendingImages = [];

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error(`"${file.name}" no es una imagen.`));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            resolve({
                id: crypto.randomUUID(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: reader.result,
                created_at: new Date().toISOString()
            });
        };

        reader.onerror = () => {
            reject(new Error(`No se pudo leer "${file.name}".`));
        };

        reader.readAsDataURL(file);
    });
}


async function readImageFiles(files) {
    const imageFiles = Array.from(files)
        .filter(file => file.type.startsWith("image/"));

    return Promise.all(
        imageFiles.map(readImageFile)
    );
}


function setupImageDropZone() {
    const dropZone = document.getElementById("imageDropZone");
    const input = document.getElementById("imageInput");

    if (!dropZone || !input) {
        console.warn("No se encontró la zona de imágenes.");
        return;
    }

    dropZone.addEventListener("click", () => {
        input.click();
    });

    input.addEventListener("change", async () => {
        console.log("CHANGE DISPARADO");
        console.log("FILES:", input.files);
        console.log("CANTIDAD:", input.files.length);

        if (!input.files?.length) return;

        await handleSelectedImages(input.files);

        console.log("PENDING DESPUÉS:", pendingImages);
    });



    dropZone.addEventListener("dragover", event => {
        event.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", async event => {
        event.preventDefault();

        dropZone.classList.remove("dragover");

        if (!event.dataTransfer.files?.length) return;

        await handleSelectedImages(event.dataTransfer.files);
    });
}


async function handleSelectedImages(files) {
    console.log("========== IMÁGENES ==========");
    console.log("FILES:", files);
    console.log("FILES LENGTH:", files.length);
    console.log("PRIMER FILE:", files[0]);

    try {
        const images = await readImageFiles(files);

        console.log("IMAGES RESULTADO:", images);
        console.log("IMAGE 0:", images[0]);

        pendingImages.push(...images);

        console.log("PENDING FINAL:", pendingImages);

        renderImagePreview();

        console.log(
            "IMG CREADA:",
            document.querySelector("#imagePreview img")
        );

    } catch (error) {
        console.error("ERROR:", error);
    }
}

function renderImagePreview() {
    const preview = document.getElementById("imagePreview");

    if (!preview) return;

    preview.innerHTML = "";

    pendingImages.forEach((image, index) => {
        const item = document.createElement("div");

        item.className = "image-preview-item";

        item.innerHTML = `
            <img
                src="${image.data}"
                alt="${image.name}"
            >

            <button
                type="button"
                class="image-remove-btn"
                title="Eliminar imagen"
                aria-label="Eliminar ${image.name}"
                data-image-id="${image.id}"
            >
                ×
            </button>
        `;

        preview.appendChild(item);
    });

    preview.querySelectorAll(".image-remove-btn").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();

            const imageId = button.dataset.imageId;

            pendingImages = pendingImages.filter(
                image => image.id !== imageId
            );

            renderImagePreview();

            console.log("Imágenes pendientes:", pendingImages);
        });
    });
}

