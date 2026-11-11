<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Re-encodes uploaded pictures so only pixels are stored: EXIF/GPS metadata and
 * anything appended to the file are dropped. Used for avatars and organization logos.
 */
class ImageReencoder
{
    /** Crops to a centred square and stores a JPEG on the public disk; returns the stored path. */
    public static function squareJpeg(UploadedFile $file, string $directory, int $size = 600): string
    {
        $image = self::load($file);
        $side = min(imagesx($image), imagesy($image));
        $square = imagecreatetruecolor($size, $size);
        imagefill($square, 0, 0, imagecolorallocate($square, 255, 255, 255));
        imagecopyresampled($square, $image, 0, 0, (int) ((imagesx($image) - $side) / 2), (int) ((imagesy($image) - $side) / 2), $size, $size, $side, $side);

        return self::store($directory, 'jpg', fn () => imagejpeg($square, null, 85));
    }

    /** Fits inside a box keeping proportions and transparency; stores a PNG on the public disk. */
    public static function fittedPng(UploadedFile $file, string $directory, int $maxSide = 512): string
    {
        $image = self::load($file);
        $scale = min(1, $maxSide / max(imagesx($image), imagesy($image)));
        $width = max(1, (int) round(imagesx($image) * $scale));
        $height = max(1, (int) round(imagesy($image) * $scale));
        $canvas = imagecreatetruecolor($width, $height);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $width, $height, imagesx($image), imagesy($image));

        return self::store($directory, 'png', fn () => imagepng($canvas, null, 6));
    }

    /** Shrinks to fit a box (keeping proportions) and stores a JPEG: video thumbnails, wide photos. */
    public static function fittedJpeg(UploadedFile $file, string $directory, int $maxSide = 1280, string $disk = 'public'): string
    {
        $image = self::load($file);
        $scale = min(1, $maxSide / max(imagesx($image), imagesy($image)));
        $width = max(1, (int) round(imagesx($image) * $scale));
        $height = max(1, (int) round(imagesy($image) * $scale));
        $canvas = imagecreatetruecolor($width, $height);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $width, $height, imagesx($image), imagesy($image));

        return self::store($directory, 'jpg', fn () => imagejpeg($canvas, null, 82), $disk);
    }

    private static function load(UploadedFile $file): \GdImage
    {
        $image = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        abort_if($image === false, 422, __('Invalid image.'));

        return $image;
    }

    private static function store(string $directory, string $extension, callable $encode, string $disk = 'public'): string
    {
        ob_start();
        $encode();
        $path = trim($directory, '/').'/'.Str::random(40).'.'.$extension;
        Storage::disk($disk)->put($path, (string) ob_get_clean());

        return $path;
    }
}
