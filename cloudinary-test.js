const cloudinary = require('cloudinary').v2;

// 1. Cấu hình Cloudinary sử dụng thông tin thật thu thập được
cloudinary.config({
    cloud_name: 'djo9fy9am',
    api_key: '658136922123142',
    api_secret: 'CrAt25OSShaoyl36iAxMv91Nptc'
});

const sampleUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

async function run() {
    try {
        console.log("Đang upload ảnh lên Cloudinary...");
        const uploadResult = await cloudinary.uploader.upload(sampleUrl, {
            public_id: 'sample_uploaded'
        });

        console.log("Upload thành công!");
        console.log("Secure URL:", uploadResult.secure_url);
        console.log("Public ID:", uploadResult.public_id);

        // 3. Lấy thông tin chi tiết của ảnh vừa upload
        console.log("\nLấy thông tin chi tiết của ảnh...");
        const details = await cloudinary.api.resource(uploadResult.public_id);
        console.log("Width:", details.width);
        console.log("Height:", details.height);
        console.log("Format:", details.format);
        console.log("File size (bytes):", details.bytes);

        // 4. Transform ảnh sử dụng f_auto và q_auto
        const transformedUrl = cloudinary.url(uploadResult.public_id, {
            secure: true,
            transformation: [
                { fetch_format: 'auto' }, // f_auto: tự động tối ưu hóa định dạng ảnh (như webp, avif) phù hợp với trình duyệt
                { quality: 'auto' }       // q_auto: tự động nén chất lượng ảnh tối ưu mà vẫn giữ nguyên độ hiển thị tốt để giảm dung lượng tải
            ]
        });

        console.log("\nDone! Click link below to see optimized version of the image. Check the size and the format.");
        console.log("Transformed URL:", transformedUrl);

    } catch (error) {
        console.error("Đã xảy ra lỗi:", error);
    }
}

run();
