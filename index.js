const express = require('express');
const cors = require('cors');
const db = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// GET /
app.get('/', (req, res) => {
    return res.status(200).json({
        status: "success",
        message: "Welcome to Barang Bekas REST API",
        student: { name: "Hasyfi Zharfan Caniago", nim: "2411522037" }
    });
});

// GET /health
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        return res.status(200).json({
            status: "success",
            message: "Backend is running",
            database: "connected",
            student: { name: "Hasyfi Zharfan Caniago", nim: "2411522037" }
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Backend is running, but database is not connected",
            database: "disconnected",
            student: { name: "Hasyfi Zharfan Caniago", nim: "2411522037" }
        });
    }
});

// GET /schema
app.get('/schema', (req, res) => {
    return res.status(200).json({
        student: {
            name: "Hasyfi Zharfan Caniago",
            nim: "2411522037"
        },
        resource: {
            name: "items",
            label: "Data Barang Bekas",
            description: "Aplikasi untuk mengelola data penjualan barang bekas (preloved)"
        },
        fields: [
            { name: "nama", label: "Nama Barang", type: "text", required: true, showInTable: true },
            { name: "merek", label: "Merek / Brand", type: "text", required: true, showInTable: true },
            { name: "harga", label: "Harga Barang", type: "number", required: true, showInTable: true },
            { name: "stok", label: "Jumlah Stok", type: "number", required: true, showInTable: true },
            { name: "kondisi", label: "Kondisi Barang", type: "text", required: true, showInTable: true },
            { name: "deskripsi", label: "Deskripsi", type: "textarea", required: false, showInTable: true }
        ],
        endpoints: {
            list: "/items",
            detail: "/items/{id}",
            create: "/items",
            update: "/items/{id}",
            delete: "/items/{id}"
        }
    });
});

// GET /items
app.get('/items', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let countQuery = 'SELECT COUNT(*) as total FROM barang_bekas';
        let dataQuery = 'SELECT id, nama, merek, harga, stok, kondisi, deskripsi FROM barang_bekas';
        let params = [];

        if (search) {
            const like = `%${search}%`;
            countQuery += ' WHERE nama LIKE ? OR merek LIKE ? OR kondisi LIKE ? OR deskripsi LIKE ?';
            dataQuery += ' WHERE nama LIKE ? OR merek LIKE ? OR kondisi LIKE ? OR deskripsi LIKE ?';
            params = [like, like, like, like];
        }

        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        const [rows] = await db.query(
            dataQuery + ' ORDER BY id DESC LIMIT ? OFFSET ?',
            [...params, limit, offset]
        );

        const cleanRows = JSON.parse(JSON.stringify(rows));

        const dataAman = cleanRows.map(item => ({
            id: String(item.id),
            nama: String(item.nama || ""),
            merek: String(item.merek || ""),
            harga: Number(item.harga || 0),
            stok: Number(item.stok || 0),
            kondisi: String(item.kondisi || ""),
            deskripsi: String(item.deskripsi || "")
        }));

        return res.status(200).json({
            status: "success",
            message: "Data retrieved successfully",
            data: dataAman,
            pagination: {
                total: total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "Gagal mengambil data", data: [] });
    }
});

// GET /items/:id
app.get('/items/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM barang_bekas WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ status: "error", message: "Data tidak ditemukan" });
        }

        const item = JSON.parse(JSON.stringify(rows[0]));
        return res.status(200).json({
            status: "success",
            message: "Data retrieved successfully",
            data: {
                id: String(item.id),
                nama: String(item.nama),
                merek: String(item.merek),
                harga: Number(item.harga),
                stok: Number(item.stok),
                kondisi: String(item.kondisi),
                deskripsi: String(item.deskripsi || "")
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "Gagal mengambil data" });
    }
});

// POST /items
app.post('/items', async (req, res) => {
    const { nama, merek, harga, stok, kondisi, deskripsi } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO barang_bekas (nama, merek, harga, stok, kondisi, deskripsi) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, merek, harga, stok, kondisi, deskripsi || ""]
        );
        return res.status(201).json({
            status: "success",
            message: "Data created successfully",
            data: {
                id: String(result.insertId),
                nama: String(nama),
                merek: String(merek),
                harga: Number(harga),
                stok: Number(stok),
                kondisi: String(kondisi),
                deskripsi: String(deskripsi || "")
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "Gagal menambahkan data" });
    }
});

// PUT /items/:id
app.put('/items/:id', async (req, res) => {
    const { nama, merek, harga, stok, kondisi, deskripsi } = req.body;
    try {
        await db.query(
            'UPDATE barang_bekas SET nama=?, merek=?, harga=?, stok=?, kondisi=?, deskripsi=? WHERE id=?',
            [nama, merek, harga, stok, kondisi, deskripsi || "", req.params.id]
        );
        return res.status(200).json({
            status: "success",
            message: "Data updated successfully",
            data: {
                id: String(req.params.id),
                nama: String(nama),
                merek: String(merek),
                harga: Number(harga),
                stok: Number(stok),
                kondisi: String(kondisi),
                deskripsi: String(deskripsi || "")
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "Gagal mengubah data" });
    }
});

// DELETE /items/:id
app.delete('/items/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM barang_bekas WHERE id = ?', [req.params.id]);
        return res.status(200).json({
            status: "success",
            message: "Data deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "Gagal menghapus data" });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});