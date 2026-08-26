let pendingImages = [];

const IMAGE_BUCKET = 'aeme-fotos';
const IMAGE_MAX_SIZE = 1600;
const IMAGE_QUALITY = 0.80;
 
function optimizeImage(file) {
    return new Promise((resolve, reject) => {

        if (!file.type.startsWith('image/')) {
            reject(new Error(`"${file.name}" no es una imagen.`));
            return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {

            URL.revokeObjectURL(objectUrl);

            let width = img.naturalWidth;
            let height = img.naturalHeight;
 
            if (width > IMAGE_MAX_SIZE || height > IMAGE_MAX_SIZE) {

                if (width > height) {
                    height = Math.round(
                        height * IMAGE_MAX_SIZE / width
                    );

                    width = IMAGE_MAX_SIZE;

                } else {
                    width = Math.round(
                        width * IMAGE_MAX_SIZE / height
                    );

                    height = IMAGE_MAX_SIZE;
                }
            }

            const canvas = document.createElement('canvas');

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', {
                alpha: false
            });

            if (!ctx) {
                reject(new Error('No se pudo crear el canvas.'));
                return;
            }
 
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(
                img,
                0,
                0,
                width,
                height
            );

            canvas.toBlob(
                blob => {

                    if (!blob) {
                        reject(
                            new Error('No se pudo comprimir la imagen.')
                        );
                        return;
                    }

                    resolve(blob);

                },
                'image/webp',
                IMAGE_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);

            reject(
                new Error(`No se pudo procesar "${file.name}".`)
            );
        };

        img.src = objectUrl;
    });
}
 
async function readImageFile(file) {

    const blob = await optimizeImage(file);

    return {
        id: crypto.randomUUID(),

        name: file.name,

        type: 'image/webp',

        size: blob.size,

        blob,

        created_at: new Date().toISOString(),
 
        uploaded: false
    };
}
 
async function readImageFiles(files) {

    const imageFiles = Array.from(files)
        .filter(file => file.type.startsWith('image/'));

    const results = [];

    for (const file of imageFiles) {

        try {

            const image = await readImageFile(file);

            results.push(image);

        } catch (error) {

            console.error(
                `Error procesando ${file.name}:`,
                error
            );

        }
    }

    return results;
}
 
function setupImageDropZone() {

    const dropZone =
        document.getElementById('imageDropZone');

    const input =
        document.getElementById('imageInput');

    if (!dropZone || !input) {

        console.warn(
            'No se encontró la zona de imágenes.'
        );

        return;
    }


    dropZone.addEventListener('click', () => {
        input.click();
    });


    input.addEventListener('change', async () => {

        if (!input.files?.length) {
            return;
        }

        await handleSelectedImages(
            input.files
        );
 
        input.value = '';
    });
 

    dropZone.addEventListener(
        'dragover',
        event => {

            event.preventDefault();

            dropZone.classList.add('dragover');
        }
    );


    dropZone.addEventListener(
        'dragleave',
        () => {

            dropZone.classList.remove(
                'dragover'
            );
        }
    );


    dropZone.addEventListener(
        'drop',
        async event => {

            event.preventDefault();

            dropZone.classList.remove(
                'dragover'
            );

            if (
                !event.dataTransfer.files?.length
            ) {
                return;
            }

            await handleSelectedImages(
                event.dataTransfer.files
            );
        }
    );
}
 
async function handleSelectedImages(files) {
 
    try {
 
        const images =
            await readImageFiles(files);

        pendingImages.push(...images); 

        renderImagePreview();

    } catch (error) {

        console.error(
            'Error procesando imágenes:',
            error
        );

        alert(
            'No se pudieron procesar algunas imágenes.'
        );
    }
}
 
function renderImagePreview() {

    const preview =
        document.getElementById('imagePreview');

    if (!preview) return;

    preview.innerHTML = '';


    pendingImages.forEach(
        (image, index) => {

            const item =
                document.createElement('div');

            item.className =
                'image-preview-item';


            let imageUrl = '';

            if (image.blob) {

                imageUrl =
                    URL.createObjectURL(
                        image.blob
                    );

            }

            else if (image.path) {

                imageUrl =
                    getOrderImageUrl(
                        image.path
                    );
            }


            item.innerHTML = `
                <img
                    src="${imageUrl}"
                    alt="${image.name || `Foto ${index + 1}`}"
                >

                <div class="image-preview-info">
                    <small>
                        ${image.size
                            ? formatImageSize(image.size)
                            : 'Guardada'
                        }
                    </small>
                </div>

                <button
                    type="button"
                    class="image-remove-btn"
                    title="Eliminar imagen"
                    aria-label="Eliminar imagen"
                    data-image-id="${image.id}"
                >
                    ×
                </button>
            `;


            const img =
                item.querySelector('img');


            if (image.blob) {

                img.addEventListener(
                    'load',
                    () => {

                        URL.revokeObjectURL(
                            imageUrl
                        );

                    }
                );
            }


            preview.appendChild(item);
        }
    );


    preview
        .querySelectorAll(
            '.image-remove-btn'
        )
        .forEach(button => {

            button.addEventListener(
                'click',
                event => {

                    event.stopPropagation();

                    const imageId =
                        button.dataset.imageId;


                    pendingImages =
                        pendingImages.filter(
                            image =>
                                image.id !== imageId
                        );


                    renderImagePreview();
                }
            );
        });
}
 
function formatImageSize(bytes) {

    if (!bytes) {
        return '0 KB';
    }

    if (bytes < 1024 * 1024) {

        return (
            (bytes / 1024).toFixed(0)
            + ' KB'
        );
    }

    return (
        (bytes / (1024 * 1024)).toFixed(2)
        + ' MB'
    );
}
 
async function uploadOrderImage(
    orderId,
    image
) {

    const extension = 'webp';

    const path =
        `ordenes/${orderId}/${image.id}.${extension}`;


    const { data, error } =
        await supabaseClient
            .storage
            .from(IMAGE_BUCKET)
            .upload(
                path,
                image.blob,
                {
                    contentType: 'image/webp',
                    cacheControl: '31536000',
                    upsert: false
                }
            );


    if (error) {

        console.error(
            'Error subiendo imagen:',
            error
        );

        throw error;
    }


    return {
        id: image.id,

        name: image.name,

        path: data.path,

        type: 'image/webp',

        size: image.size,

        created_at: image.created_at
    };
}
 
async function uploadOrderImages(
    orderId,
    images
) {

    if (!images?.length) {
        return [];
    }

    const uploaded = [];

    for (const image of images) {

        if (!image.blob && image.path) {

            uploaded.push(image);

            continue;
        }


        const result =
            await uploadOrderImage(
                orderId,
                image
            );

        uploaded.push(result);
    }

    return uploaded;
}
 
async function getOrderImageUrl(path) {

    if (!path) {
        return '';
    }

    const { data, error } =
        await supabaseClient
            .storage
            .from(IMAGE_BUCKET)
            .createSignedUrl(path, 3600);

    if (error) {

        console.error(
            'Error creando URL de imagen:',
            error
        );

        return '';
    }

    return data.signedUrl;
}


 
async function deleteOrderImages(images) {

    if (!images?.length) {
        return;
    }

    const paths =
        images
            .map(image => image.path)
            .filter(Boolean);

    if (!paths.length) {
        return;
    }

    const { error } =
        await supabaseClient
            .storage
            .from(IMAGE_BUCKET)
            .remove(paths);

    if (error) {

        console.error(
            'Error eliminando imágenes:',
            error
        );

        throw error;
    }
}
