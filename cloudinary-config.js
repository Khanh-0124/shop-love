// Cấu hình Cloudinary của bạn (Hãy thay đổi các thông số dưới đây bằng thông số từ tài khoản Cloudinary của bạn)
const CLOUDINARY_CLOUD_NAME = "djo9fy9am";
const CLOUDINARY_UPLOAD_PRESET = "shop-love";

/**
 * Hàm upload file (ảnh hoặc nhạc) lên Cloudinary bằng REST API
 * @param {File|Blob} fileOrBlob - Tệp tin hoặc dữ liệu nhị phân cần tải lên
 * @param {string} resourceType - Định dạng: 'image' cho ảnh, 'video' cho nhạc (Cloudinary quản lý nhạc trong mục video/raw) hoặc 'auto'
 * @returns {Promise<string>} - Trả về URL tải trực tiếp (HTTPS)
 */
async function uploadToCloudinary(fileOrBlob, resourceType = 'auto') {
    if (!fileOrBlob) {
        console.warn("Không có file nào được chọn.");
        return null;
    }

    if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME" || CLOUDINARY_UPLOAD_PRESET === "YOUR_UNSIGNED_UPLOAD_PRESET") {
        console.error("Vui lòng cấu hình CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET trong file cloudinary-config.js trước.");
        alert("Vui lòng cấu hình Cloud Name và Upload Preset trong file cloudinary-config.js!");
        return null;
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    const formData = new FormData();
    let uploadData = fileOrBlob;

    // Nếu là URL trực tuyến, thử fetch trước thành Blob để tránh cấu hình chặn upload URL trên Cloudinary
    if (typeof fileOrBlob === 'string' && (fileOrBlob.startsWith('http://') || fileOrBlob.startsWith('https://'))) {
        try {
            console.log("Thử tải tệp về trình duyệt khách...");
            const fetchRes = await fetch(fileOrBlob);
            if (fetchRes.ok) {
                const blob = await fetchRes.blob();
                const name = fileOrBlob.split('/').pop().split('?')[0] || 'remote_file';
                blob.name = name;
                uploadData = blob;
                console.log("Tải tệp thành công dưới dạng Blob.");
            }
        } catch (fetchError) {
            console.warn("Không thể fetch trực tiếp tệp về client (CORS). Sẽ để Cloudinary tự tải tệp từ xa từ máy chủ của họ.", fetchError);
        }
    }
    
    // Gán file và cấu hình unsigned upload preset
    formData.append('file', uploadData);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
        console.log(`Đang tải tệp lên Cloudinary (${resourceType})...`);
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Lỗi tải tệp lên Cloudinary");
        }

        const data = await response.json();
        console.log("Tải lên Cloudinary thành công! Link tệp: ", data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error("Lỗi upload Cloudinary:", error);
        throw error;
    }
}
